import React from "react";

const SLEEP_STAGES = ["Deep Sleep", "Light Sleep", "Awake Stage", "Unoccupied"];
const MOTION_MODES = ["Stationary", "Micro-Motion", "Active Movement"];

export default function ArgusVitalsMatrix({ live, online }) {
  const heartRate = live?.heartRate ?? 0;
  const breathRate = live?.breathRate ?? 0;
  const presence = live?.presence ?? false;
  const inBed = live?.inBed ?? false;
  const motion = live?.motion ?? 0;
  const sleepState = live?.sleepState ?? 3;
  const distance = live?.distance ?? 0;

  const isHeartActive = online && heartRate > 0;
  const isBreathActive = online && breathRate > 0;

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

      {/* 2. Motion State Card */}
      <div className="argus-card motion-state-card">
        <div className="argus-card-header">
          <div className="argus-card-title-row">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <span className="argus-card-title">Motion Dynamics</span>
          </div>
          <span className="argus-chip-small amber-chip">{MOTION_MODES[motion] ?? "Stationary"}</span>
        </div>

        <div className="motion-card-body">
          <div className="motion-main-val">
            <span className="motion-val-text">{MOTION_MODES[motion] ?? "Stationary"}</span>
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

      {/* 3. In-Bed Occupancy Card */}
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
            <span className="argus-card-title">Bed Occupancy</span>
          </div>
          <span className={`argus-chip-small ${inBed ? "green-chip" : "muted-chip"}`}>
            {inBed ? "Occupied" : "Vacant"}
          </span>
        </div>

        <div className="occupancy-body">
          <div className="occupancy-val">{inBed ? "In Bed" : "Out of Bed"}</div>
          <div className="occupancy-sub">
            {presence ? "Target Presence Detected" : "No Target Detected"}
          </div>
        </div>
      </div>

      {/* 4. Sleep Phase Card */}
      <div className="argus-card phase-card">
        <div className="argus-card-header">
          <div className="argus-card-title-row">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
            <span className="argus-card-title">Sleep Stage</span>
          </div>
          <span className="argus-chip-small purple-chip">
            {SLEEP_STAGES[sleepState] ?? "Unoccupied"}
          </span>
        </div>

        <div className="phase-body">
          <div className="phase-val">{SLEEP_STAGES[sleepState] ?? "Unoccupied"}</div>
          <div className="phase-sub">
            Quality Rating: {live?.quality ?? "Normal"}
          </div>
        </div>
      </div>
    </div>
  );
}
