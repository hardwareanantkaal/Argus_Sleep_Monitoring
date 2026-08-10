import React, { useState } from "react";

export default function PlacementCheckModal({ isOpen, onClose, live }) {
  const [calibrating, setCalibrating] = useState(false);
  const [activeTip, setActiveTip] = useState(null); // index of clicked tip

  if (!isOpen) return null;

  // Basic live condition checks
  const hasPresence = Boolean(live?.presence);
  const isStill = live ? live.motion !== 2 : false; // 0 = None, 1 = Still, 2 = Active
  const hasBreath = Boolean(live?.breathRate && live.breathRate > 0);
  const hasHeart = Boolean(live?.heartRate && live.heartRate > 0);

  // Condition checklist configuration
  const checklistItems = [
    {
      id: "presence",
      label: "Presence detected",
      passed: hasPresence,
      explanation: "No target detected. Ensure you are lying in bed within 0.5–1.5 meters of the sensor.",
    },
    {
      id: "stillness",
      label: "Holding still",
      passed: isStill,
      explanation: "Active movement detected. Hold still for few seconds without moving your body.",
    },
    {
      id: "breathing",
      label: "Breathing detected",
      passed: hasBreath,
      explanation: "Radar searching for chest movement. Breathe steadily and ensure sensor is facing your chest.",
    },
    {
      id: "heart",
      label: "Heart rate locked",
      passed: hasHeart,
      explanation: "Acquiring micro-cardiac rhythm. Remain calm and stay still within 0.8 meters for radar signal lock.",
    },
  ];

  const metCount = checklistItems.filter((i) => i.passed).length;
  const signalScore = metCount * 25;

  // Status guidance message
  let statusMessage = "No target — place sensor ~0.5–0.8 m away";
  if (metCount === 4) {
    statusMessage = "Perfect spot — radar fully locked!";
  } else if (metCount === 3) {
    statusMessage = "Almost — keep still, breathe slowly...";
  } else if (metCount === 2) {
    statusMessage = "Positioning sensor — face chest towards radar";
  } else if (metCount === 1) {
    statusMessage = "Presence detected — settle into bed";
  }

  // Gauge SVG calculations
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (signalScore / 100) * circumference;

  const handleRecalibrate = () => {
    setCalibrating(true);
    setTimeout(() => {
      setCalibrating(false);
    }, 2500);
  };

  return (
    <div className="placement-modal-overlay" onClick={onClose}>
      <div className="placement-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Top Handle Pill */}
        <div className="modal-top-handle" />

        {/* Modal Header */}
        <div className="placement-modal-header">
          <h2 className="placement-modal-title">Placement Check</h2>
          <button className="placement-modal-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        {/* Signal Score Gauge */}
        <div className="placement-gauge-wrap">
          <svg className="placement-gauge-svg" width="130" height="130" viewBox="0 0 130 130">
            <defs>
              <linearGradient id="signalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="50%" stopColor="#facc15" />
                <stop offset="100%" stopColor="#4ade80" />
              </linearGradient>
            </defs>

            <circle cx="65" cy="65" r={radius} className="placement-ring-track" strokeWidth="10" fill="none" />
            <circle
              cx="65"
              cy="65"
              r={radius}
              className="placement-ring-progress"
              strokeWidth="10"
              stroke="url(#signalGrad)"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={progressOffset}
              strokeLinecap="round"
              transform="rotate(-90 65 65)"
            />
          </svg>

          <div className="placement-gauge-center">
            <span className="placement-score-num">{calibrating ? "..." : signalScore}</span>
            <span className="placement-score-lbl">SIGNAL</span>
          </div>
        </div>

        {/* Dynamic Status Message */}
        <div className="placement-status-msg">{calibrating ? "Calibrating radar beam..." : statusMessage}</div>

        {/* Condition Checklist with Failure Explanations */}
        <div className="placement-checklist">
          {checklistItems.map((item, idx) => (
            <div key={item.id} className="checklist-item-wrapper">
              <div
                className={`placement-check-item ${item.passed ? "passed" : "failed"}`}
                onClick={() => !item.passed && setActiveTip(activeTip === idx ? null : idx)}
                style={{ cursor: item.passed ? "default" : "pointer" }}
              >
                <span className="check-icon-circle">
                  {item.passed ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="3" />
                    </svg>
                  )}
                </span>

                <span className="check-text">{item.label}</span>

                {!item.passed && (
                  <span className="failed-info-badge" title="Click for details">
                    Needs Action
                  </span>
                )}
              </div>

              {/* Failure Explanation Box */}
              {!item.passed && (
                <div className={`failure-explanation-box ${activeTip === idx || metCount < 4 ? "visible" : ""}`}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                    <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="3" />
                  </svg>
                  <span>{item.explanation}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Pulsing Breathing Pacer Circle */}
        <div className="breath-pacer-wrapper">
          <div className="breath-pacer-sphere" />
          <p className="breath-pacer-guide">
            Breathe slowly with the circle — it helps the radar lock faster.
          </p>
        </div>

        {/* Action Button */}
        <button className="recalibrate-btn" onClick={handleRecalibrate} disabled={calibrating}>
          {calibrating ? "Recalibrating..." : "Recalibrate sensor"}
        </button>

        {/* Placement Instruction Subtext */}
        <p className="placement-footer-subtext">
          Place the sensor ~0.5–0.8 m away, chest facing it. All four green = perfect spot.
        </p>
      </div>
    </div>
  );
}
