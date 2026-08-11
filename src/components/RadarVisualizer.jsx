import React from "react";
import { formatPresence, formatMovement } from "../utils/argusEnums.js";

export default function RadarVisualizer({ presence, distance, motion, online }) {
  const maxDistance = 400;
  const distVal = typeof distance === "number" ? Math.min(distance, maxDistance) : 0;
  const distPercent = Math.max(15, Math.min(88, (distVal / maxDistance) * 100));

  const presenceText = formatPresence(presence);
  const movementVal = formatMovement(motion);

  return (
    <div className="radar-container">
      <div className="radar-header">
        <div className="radar-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span>60GHz Millimeter-Wave Radar</span>
        </div>
        <div className={`radar-presence-tag ${presenceText === "Someone is present" ? "detected" : "none"}`}>
          {presenceText.toUpperCase()}
        </div>
      </div>

      <div className="radar-screen">
        {/* Radar concentric circles */}
        <div className="radar-ring ring-1"></div>
        <div className="radar-ring ring-2"></div>
        <div className="radar-ring ring-3"></div>
        <div className="radar-crosshair-h"></div>
        <div className="radar-crosshair-v"></div>

        {/* Sweeping laser scanner beam */}
        {online && <div className="radar-sweep"></div>}

        {/* Target blip indicator */}
        {(presence === 1 || presence === true) && online && (
          <div
            className={`radar-blip ${movementVal > 0 ? "active" : ""}`}
            style={{
              top: `${50 - (distPercent / 2.5) * Math.sin(1.2)}%`,
              left: `${50 + (distPercent / 2.5) * Math.cos(1.2)}%`,
            }}
          >
            <div className="blip-core"></div>
            <div className="blip-wave"></div>
            <div className="blip-label">{distance ? `${distance} cm` : "Target"}</div>
          </div>
        )}

        <div className="radar-center-dot"></div>
      </div>

      <div className="radar-footer">
        <div className="radar-metric">
          <span className="metric-lbl">Target Distance</span>
          <span className="metric-val">{(presence === 1 || presence === true) && distance !== undefined ? `${distance} cm` : "—"}</span>
        </div>
        <div className="radar-metric">
          <span className="metric-lbl">Movement</span>
          <span className="metric-val">{movementVal}</span>
        </div>
        <div className="radar-metric">
          <span className="metric-lbl">Sensor Link</span>
          <span className={`metric-status ${online ? "good" : "off"}`}>
            {online ? "ACTIVE" : "OFFLINE"}
          </span>
        </div>
      </div>
    </div>
  );
}

