import React from "react";

export default function VitalsCombinedCard({ heartRate, breathRate, online }) {
  const isHeartActive = online && heartRate > 0;
  const isBreathActive = online && breathRate > 0;

  return (
    <div className="vital-hero-card theme-cyan dual-vitals-card">
      <div className="vital-card-top">
        <div className="vital-title-wrap">
          <div className="vital-icon-container">
            <svg className="vital-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <span className="vital-card-title">Vital Signs (BPM & RPM)</span>
        </div>
        <span className="vital-status-pill">
          {online ? "Live Vitals" : "Offline"}
        </span>
      </div>

      <div className="dual-vitals-grid">
        {/* Heart Rate Section */}
        <div className="dual-vital-item">
          <div className="dual-vital-header">
            <svg className={`dual-icon ${isHeartActive ? "pulse-heart" : ""}`} viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span className="dual-lbl">Heart Rate</span>
          </div>
          <div className="dual-vital-val-row">
            <span className="dual-val">{heartRate ?? "—"}</span>
            <span className="dual-unit">BPM</span>
          </div>
          <div className="dual-subtext">
            {heartRate ? (heartRate > 100 ? "Elevated rhythm" : "Normal rhythm") : "Awaiting signal"}
          </div>
        </div>

        <div className="dual-divider"></div>

        {/* Breath Rate Section */}
        <div className="dual-vital-item">
          <div className="dual-vital-header">
            <svg className={`dual-icon ${isBreathActive ? "breath-wave" : ""}`} viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
              <path d="M12 12c-3 0-5 2.5-5 5.5s2 5.5 5 5.5 5-2.5 5-5.5-2-5.5-5-5.5z" />
              <path d="M12 2C6.5 2 2 6.5 2 12c0 2.5 1 4.5 2.5 6" />
              <path d="M22 12c0-5.5-4.5-10-10-10" />
            </svg>
            <span className="dual-lbl">Breath Rate</span>
          </div>
          <div className="dual-vital-val-row">
            <span className="dual-val" style={{ color: "#4ade80" }}>{breathRate ?? "—"}</span>
            <span className="dual-unit">RPM</span>
          </div>
          <div className="dual-subtext">
            {breathRate ? "Regular breathing" : "Awaiting signal"}
          </div>
        </div>
      </div>
    </div>
  );
}
