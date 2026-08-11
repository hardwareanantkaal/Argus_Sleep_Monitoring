import React from "react";
import {
  formatInBed,
  formatPresence,
  formatMovement,
  formatBreathState,
  formatDisturbance,
  formatAbnormal,
  formatRating,
  getEffectiveLiveStage,
} from "../utils/argusEnums.js";
import SleepStageChart from "./SleepStageChart.jsx";

export default function LiveDataSection({ live, online }) {
  const heartRate = live?.heartRate ?? 0;
  const breathRate = live?.breathRate ?? 0;
  const breathStateVal = formatBreathState(live?.breathState);
  const presenceVal = live?.presence;
  const inBedVal = live?.inBed;
  
  // Clean End-User Motion Text (0 = None, 1 = Still, 2 = Active)
  const rawMotion = formatMovement(live?.motion ?? live?.movement);
  const motionText = rawMotion === 2 ? "Active" : rawMotion === 1 ? "Still" : "None";
  
  const movingRange = live?.movingRange ?? 0;
  const distance = live?.distance ?? 0;
  
  // rating: 0 = None, 1 = Good, 2 = Average, 3 = Poor
  const ratingStr = formatRating(live?.rating ?? live?.quality ?? 0);
  
  // disturbance: 0 = sleep <4h, 1 = sleep >12h, 2 = long abnormal absence, 3 = none
  const disturbanceStr = formatDisturbance(live?.disturbance ?? 3);
  
  // abnormal: 0 = None, 1 = Normal, 2 = Abnormal struggle
  const abnormalStr = formatAbnormal(live?.abnormal ?? 0);

  const effectiveStage = getEffectiveLiveStage(live);
  const currentStage = effectiveStage.stage;

  const isHeartActive = online && heartRate > 0;
  const isBreathActive = online && breathRate > 0;

  const inBedStr = formatInBed(inBedVal);
  const presenceStr = formatPresence(presenceVal);

  const getStageColorClass = (stageStr) => {
    const s = (stageStr || "").toLowerCase();
    if (s.includes("awake")) return "amber-chip";
    if (s.includes("light") || s.includes("shallow")) return "cyan-chip";
    if (s.includes("deep")) return "purple-chip";
    return "muted-chip";
  };

  return (
    <section className="dashboard-section live-data-section">
      <div className="section-header-row">
        <span className="section-badge cyan-bg">1. LIVE DATA</span>
        <h2 className="section-title-bold">Real-Time Live Telemetry</h2>
        <span className="section-subtitle-muted">· Direct sensor stream</span>
      </div>

      {/* Row 1: Primary Vitals & Motion Hero Cards */}
      <div className="argus-vitals-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "16px" }}>
        {/* Card 1: Vital Signs */}
        <div className="argus-card vital-combined-card">
          <div className="argus-card-header">
            <div className="argus-card-title-row">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <span className="argus-card-title">Vital Signs</span>
            </div>
            <span className="argus-chip-small">{online ? "Active Stream" : "Offline"}</span>
          </div>

          <div className="vitals-dual-body">
            <div className="vital-item">
              <span className="vital-lbl">Heart Rate</span>
              <div className="vital-val-row">
                <span className={`vital-val cyan-val ${isHeartActive ? "pulse-anim" : ""}`}>{heartRate}</span>
                <span className="vital-unit">BPM</span>
              </div>
              <span className="vital-sub-lbl">
                {heartRate ? (heartRate > 100 ? "Elevated Rate" : "Normal Rhythm") : "No Signal Lock"}
              </span>
            </div>

            <div className="vital-divider" />

            <div className="vital-item">
              <span className="vital-lbl">Respiration</span>
              <div className="vital-val-row">
                <span className={`vital-val emerald-val ${isBreathActive ? "pulse-anim" : ""}`}>{breathRate}</span>
                <span className="vital-unit">RPM</span>
              </div>
              <span className="vital-sub-lbl">
                Pattern: <strong>{breathStateVal}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Movement Dynamics */}
        <div className="argus-card motion-state-card">
          <div className="argus-card-header">
            <div className="argus-card-title-row">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              <span className="argus-card-title">Movement Dynamics</span>
            </div>
            <span className="argus-chip-small amber-chip">{motionText}</span>
          </div>

          <div className="motion-card-body">
            <div className="motion-main-val">
              <span className="motion-val-text" style={{ fontSize: "32px", fontWeight: "800", color: "#f59e0b" }}>
                {motionText}
              </span>
            </div>
            <div className="motion-sub-info">
              <div className="motion-detail-row">
                <span className="detail-lbl">Moving Range</span>
                <span className="detail-val">{movingRange}%</span>
              </div>
              <div className="motion-detail-row">
                <span className="detail-lbl">Target Distance</span>
                <span className="detail-val">{distance ? `${distance} cm` : "—"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Bed Occupancy & Presence */}
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
            <div className="occupancy-sub">{presenceStr}</div>
          </div>
        </div>

        {/* Card 4: Current Sleep Stage */}
        <div className="argus-card phase-card">
          <div className="argus-card-header">
            <div className="argus-card-title-row">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
              <span className="argus-card-title">Current Sleep Stage</span>
            </div>
            <span className={`argus-chip-small ${getStageColorClass(currentStage)}`}>
              {currentStage}
            </span>
          </div>

          <div className="phase-body">
            <div className="phase-val" style={{ fontSize: "24px", fontWeight: "800" }}>
              {currentStage}
            </div>
            <div className="phase-sub">
              Source: <strong>{effectiveStage.source}</strong> ({effectiveStage.time})
            </div>
          </div>
        </div>
      </div>

      {live?.sleepTimeline && (
        <SleepStageChart
          sleepTimeline={live.sleepTimeline}
          title="Live Sleep Stage Timeline (Current Session)"
        />
      )}
    </section>
  );
}

