import React from "react";
import { formatMovement } from "../utils/argusEnums.js";

export default function MotionCard({ motion, distance, cTurn, cLarge, cMinor }) {
  const movementVal = formatMovement(motion);

  return (
    <div className="vital-hero-card theme-amber motion-card">
      <div className="vital-card-top">
        <div className="vital-title-wrap">
          <div className="vital-icon-container">
            <svg className="vital-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <span className="vital-card-title">Movement State</span>
        </div>
        <span className="vital-status-pill" style={{ borderColor: "#f59e0b", color: "#f59e0b" }}>
          Level {movementVal}
        </span>
      </div>

      <div className="vital-card-body">
        <div className="vital-value-group">
          <span className="vital-main-value" style={{ fontSize: "40px", fontWeight: "800" }}>{movementVal}</span>
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

