import React from "react";
import {
  formatSleepState,
  formatInBed,
  formatPresence,
  formatDisturbance,
  formatRating,
  formatAbnormal,
  formatMovement,
} from "../utils/argusEnums.js";

export default function ArgusVitalsMatrix({ live, online }) {
  const heartRate = live?.heartRate ?? 0;
  const breathRate = live?.breathRate ?? 0;
  const presenceVal = live?.presence;
  const inBedVal = live?.inBed;
  const movementVal = formatMovement(live?.motion ?? live?.movement);
  const sleepStateVal = live?.sleepState ?? 3;
  const disturbanceVal = live?.disturbance ?? live?.eSleepDisturbances ?? live?.sDisturbance ?? 3;
  const ratingVal = live?.rating ?? live?.quality ?? 0;
  const abnormalVal = live?.abnormal ?? live?.eAbnormalStruggle ?? live?.struggle ?? 0;
  const distance = live?.distance ?? 0;

  const isHeartActive = online && heartRate > 0;
  const isBreathActive = online && breathRate > 0;

  const inBedStr = formatInBed(inBedVal);
  const presenceStr = formatPresence(presenceVal);
  const sleepStateStr = formatSleepState(sleepStateVal);
  const disturbanceStr = formatDisturbance(disturbanceVal);
  const ratingStr = formatRating(ratingVal);
  const abnormalStr = formatAbnormal(abnormalVal);

  return (
    <div className="argus-vitals-grid">
      {/* 1. Combined Vital Signs (BPM & RPM in 1 card) */}
      <div className="argus-card vital-combined-card">
        <div className="argus-card-header">
          <div className="argus-card-title-row">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <span className="argus-card-title">Vital Signs (BPM & RPM)</span>
          </div>
          <span className="argus-chip-small">{online ? "Active Stream" : "Offline"}</span>
        </div>

        <div className="vitals-dual-body">
          {/* Heart Rate */}
          <div className="vital-item">
            <span className="vital-lbl">Heart Rate</span>
            <div className="vital-val-row">
              <span className={`vital-val cyan-val ${isHeartActive ? "pulse-anim" : ""}`}>{heartRate}</span>
              <span className="vital-unit">BPM</span>
            </div>
            <span className="vital-sub-lbl">
              {heartRate ? (heartRate > 100 ? "Elevated Rate" : "Normal Cardiac Rhythm") : "No Signal Lock"}
            </span>
          </div>

          <div className="vital-divider" />

          {/* Breath Rate */}
          <div className="vital-item">
            <span className="vital-lbl">Respiration Rate</span>
            <div className="vital-val-row">
              <span className={`vital-val emerald-val ${isBreathActive ? "pulse-anim" : ""}`}>{breathRate}</span>
              <span className="vital-unit">RPM</span>
            </div>
            <span className="vital-sub-lbl">
              {breathRate ? "Regular Respiration" : "No Signal Lock"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Motion Dynamics Card (Numeric Movement Display) */}
      <div className="argus-card motion-state-card">
        <div className="argus-card-header">
          <div className="argus-card-title-row">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <span className="argus-card-title">Movement Dynamics</span>
          </div>
          <span className="argus-chip-small amber-chip">Level {movementVal}</span>
        </div>

        <div className="motion-card-body">
          <div className="motion-main-val">
            <span className="motion-val-text" style={{ fontSize: "36px", fontWeight: "800", color: "#f59e0b" }}>
              {movementVal}
            </span>
          </div>
          <div className="motion-sub-info">
            <div className="motion-detail-row">
              <span className="detail-lbl">Target Distance</span>
              <span className="detail-val">{distance ? `${distance} cm` : "—"}</span>
            </div>
            <div className="motion-detail-row">
              <span className="detail-lbl">Turnovers</span>
              <span className="detail-val">{live?.cTurn ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bed Occupancy Card */}
      <div className="argus-card occupancy-card">
        <div className="argus-card-header">
          <div className="argus-card-title-row">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.2">
              <path d="M2 4v16" />
              <path d="M2 8h18a2 2 0 0 1 2 2v10" />
              <path d="M2 17h20" />
              <path d="M6 8v9" />
              <circle cx="7" cy="11" r="1.5" />
            </svg>
            <span className="argus-card-title">Bed & Presence</span>
          </div>
          <span className={`argus-chip-small ${inBedStr === "In bed" ? "green-chip" : "muted-chip"}`}>
            {inBedStr}
          </span>
        </div>

        <div className="occupancy-body">
          <div className="occupancy-val">{inBedStr}</div>
          <div className="occupancy-sub">
            {presenceStr}
          </div>
        </div>
      </div>

      {/* 4. Sleep Stage & Rating Card */}
      <div className="argus-card phase-card">
        <div className="argus-card-header">
          <div className="argus-card-title-row">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
            <span className="argus-card-title">Sleep Stage & Quality</span>
          </div>
          <span className="argus-chip-small purple-chip">
            {sleepStateStr}
          </span>
        </div>

        <div className="phase-body">
          <div className="phase-val">{sleepStateStr}</div>
          <div className="phase-sub">
            Rating: <strong>{ratingStr}</strong>
          </div>
        </div>
      </div>

      {/* 5. Disturbance & Struggle Status Card */}
      <div className="argus-card disturbance-card">
        <div className="argus-card-header">
          <div className="argus-card-title-row">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2.2">
              <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="3" />
            </svg>
            <span className="argus-card-title">Disturbance & Struggle</span>
          </div>
          <span className={`argus-chip-small ${abnormalStr.includes("Abnormal") ? "rose-chip" : "muted-chip"}`}>
            {abnormalStr}
          </span>
        </div>

        <div className="phase-body">
          <div className="phase-sub-item" style={{ marginBottom: "6px" }}>
            <span className="detail-lbl" style={{ fontSize: "11px", color: "var(--text-muted)", display: "block" }}>
              DISTURBANCE STATUS
            </span>
            <span style={{ fontSize: "14px", fontWeight: "600", color: disturbanceStr === "None" ? "var(--text-main)" : "#f43f5e" }}>
              {disturbanceStr}
            </span>
          </div>
          <div className="phase-sub-item">
            <span className="detail-lbl" style={{ fontSize: "11px", color: "var(--text-muted)", display: "block" }}>
              STRUGGLE STATUS
            </span>
            <span style={{ fontSize: "14px", fontWeight: "600", color: abnormalStr.includes("Abnormal") ? "#f43f5e" : "var(--emerald-accent)" }}>
              {abnormalStr}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

