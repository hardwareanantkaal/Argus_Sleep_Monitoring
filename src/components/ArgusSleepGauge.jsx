import React from "react";

export default function ArgusSleepGauge({ score, quality, deepPct, sleepTimeMin }) {
  const displayScore = typeof score === "number" ? Math.min(100, Math.max(0, score)) : 75;

  // Arc calculations (Radius 58, Circumference = 2 * PI * 58 = 364.42)
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (displayScore / 100) * circumference;

  let ratingTier = "Optimal Rest";
  let tierColor = "#10b981";
  if (displayScore < 50) {
    ratingTier = "Restless Sleep";
    tierColor = "#f43f5e";
  } else if (displayScore < 70) {
    ratingTier = "Moderate Rest";
    tierColor = "#f59e0b";
  } else if (displayScore < 85) {
    ratingTier = "Good Rest";
    tierColor = "#06b6d4";
  }

  const hoursAsleep = sleepTimeMin ? (sleepTimeMin / 60).toFixed(1) : "0.0";

  return (
    <div className="argus-card argus-gauge-card">
      <div className="argus-card-header">
        <span className="argus-card-title">Sleep Quality Index</span>
        <span className="argus-badge-pill" style={{ borderColor: tierColor, color: tierColor }}>
          {quality !== undefined && quality !== null ? `Score: ${quality}` : ratingTier}
        </span>
      </div>

      <div className="argus-gauge-body">
        <div className="argus-ring-container">
          <svg className="argus-ring-svg" width="150" height="150" viewBox="0 0 150 150">
            <defs>
              <linearGradient id="argusRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="50%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>

            <circle cx="75" cy="75" r={radius} className="argus-ring-track" strokeWidth="12" fill="none" />
            <circle
              cx="75"
              cy="75"
              r={radius}
              className="argus-ring-progress"
              strokeWidth="12"
              stroke="url(#argusRingGrad)"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={progressOffset}
              strokeLinecap="round"
              transform="rotate(-90 75 75)"
            />
          </svg>

          <div className="argus-ring-center">
            <span className="argus-score-num">{displayScore}</span>
            <span className="argus-score-max">/ 100</span>
          </div>
        </div>

        <div className="argus-gauge-metrics">
          <div className="argus-sub-metric">
            <span className="sub-lbl">Time Asleep</span>
            <span className="sub-val">{hoursAsleep} hrs</span>
          </div>
          <div className="argus-sub-metric">
            <span className="sub-lbl">Deep Ratio</span>
            <span className="sub-val">{deepPct ?? 0}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
