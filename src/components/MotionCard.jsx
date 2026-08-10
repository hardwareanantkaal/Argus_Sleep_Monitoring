import React from "react";

const MOTION_STATE = ["None", "Still", "Active"];

export default function MotionCard({ motion, distance, cTurn, cLarge, cMinor }) {
  const motionLabel = MOTION_STATE[motion] ?? "—";

  let badgeText = "No Motion";
  let badgeColor = "#64748b"; // slate
  if (motion === 1) {
    badgeText = "Micro-Motion";
    badgeColor = "#38bdf8"; // cyan
  } else if (motion === 2) {
    badgeText = "Active Body Movement";
    badgeColor = "#fbbf24"; // amber
  }

  return (
    <div className="vital-hero-card theme-amber motion-card">
      <div className="vital-card-top">
        <div className="vital-title-wrap">
          <div className="vital-icon-container">
            <svg className="vital-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <span className="vital-card-title">Motion State</span>
        </div>
        <span className="vital-status-pill" style={{ borderColor: badgeColor, color: badgeColor }}>
          {badgeText}
        </span>
      </div>

      <div className="vital-card-body">
        <div className="vital-value-group">
          <span className="vital-main-value">{motionLabel}</span>
        </div>
      </div>

      <div className="motion-details-grid">
        <div className="motion-sub-item">
          <span className="motion-lbl">Target Distance</span>
          <span className="motion-val">{distance !== undefined && distance !== null ? `${distance} cm` : "—"}</span>
        </div>
        <div className="motion-sub-item">
          <span className="motion-lbl">Turnovers</span>
          <span className="motion-val">{cTurn ?? "—"}</span>
        </div>
        <div className="motion-sub-item">
          <span className="motion-lbl">Large Motion</span>
          <span className="motion-val">{cLarge ?? "—"}</span>
        </div>
        <div className="motion-sub-item">
          <span className="motion-lbl">Minor Motion</span>
          <span className="motion-val">{cMinor ?? "—"}</span>
        </div>
      </div>
    </div>
  );
}
