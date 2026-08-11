import React from "react";
import {
  formatDisturbance,
  formatAbnormal,
  formatRating,
  getCompositeData,
} from "../utils/argusEnums.js";

export default function CompositeSection({ live }) {
  const disturbanceStr = formatDisturbance(live?.disturbance ?? live?.eSleepDisturbances ?? live?.sDisturbance ?? 3);
  const abnormalStr = formatAbnormal(live?.abnormal ?? live?.eAbnormalStruggle ?? live?.struggle ?? 0);
  const ratingStr = formatRating(live?.rating ?? live?.quality ?? 0);

  const composite = getCompositeData(live);
  const { cResp, cHeart, cTurn, cLarge, cMinor, cApnea } = composite;


  return (
    <section className="dashboard-section composite-section">
      <div className="section-header-row">
        <span className="section-badge purple-bg">2. COMPOSITE</span>
        <h2 className="section-title-bold">Composite Telemetry & Firmware Diagnostics</h2>
        <span className="section-subtitle-muted">· Diagnostic monitors & rolling averages</span>
      </div>

      <div className="composite-grid">
        {/* Firmware Enums Cards */}
        <div className="argus-card composite-enum-card">
          <div className="argus-card-header">
            <div className="argus-card-title-row">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2.2">
                <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="3" />
              </svg>
              <span className="argus-card-title">Sleep Disturbance (eSleepDisturbances)</span>
            </div>
            <span className={`argus-chip-small ${disturbanceStr === "None" ? "muted-chip" : "rose-chip"}`}>
              {disturbanceStr === "None" ? "Normal" : "Disturbance"}
            </span>
          </div>
          <div className="composite-card-body">
            <div className="composite-main-str rose-val">{disturbanceStr}</div>
            <span className="composite-sub-text">Firmware sleep duration & absence monitor</span>
          </div>
        </div>

        <div className="argus-card composite-enum-card">
          <div className="argus-card-header">
            <div className="argus-card-title-row">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" />
                <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" />
              </svg>
              <span className="argus-card-title">Struggle Monitor (eAbnormalStruggle)</span>
            </div>
            <span className={`argus-chip-small ${abnormalStr.includes("Abnormal") ? "rose-chip" : "green-chip"}`}>
              {abnormalStr}
            </span>
          </div>
          <div className="composite-card-body">
            <div className="composite-main-str amber-val">{abnormalStr}</div>
            <span className="composite-sub-text">Abnormal struggle & movement detection</span>
          </div>
        </div>

        <div className="argus-card composite-enum-card">
          <div className="argus-card-header">
            <div className="argus-card-title-row">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.2">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className="argus-card-title">Quality Rating (eSleepQualityRating)</span>
            </div>
            <span className="argus-chip-small cyan-chip">{ratingStr}</span>
          </div>
          <div className="composite-card-body">
            <div className="composite-main-str cyan-val">{ratingStr}</div>
            <span className="composite-sub-text">Firmware calculated sleep quality rating</span>
          </div>
        </div>
      </div>

      {/* Composite Rolling Metrics Stats Bar */}
      <div className="composite-metrics-grid">
        <div className="argus-stat-item">
          <div className="stat-item-lbl">Rolling Avg Respiration</div>
          <div className="stat-item-val-row">
            <span className="stat-item-val cyan-val">{cResp}</span>
            <span className="stat-item-unit">RPM</span>
          </div>
          <div className="stat-item-sub">Breathing frequency</div>
        </div>

        <div className="argus-stat-item">
          <div className="stat-item-lbl">Rolling Avg Cardiac Rate</div>
          <div className="stat-item-val-row">
            <span className="stat-item-val emerald-val">{cHeart}</span>
            <span className="stat-item-unit">BPM</span>
          </div>
          <div className="stat-item-sub">Heartbeat frequency</div>
        </div>

        <div className="argus-stat-item">
          <div className="stat-item-lbl">Apnea Disruptions (cApnea)</div>
          <div className="stat-item-val-row">
            <span className="stat-item-val rose-val">{cApnea}</span>
          </div>
          <div className="stat-item-sub">Breathing pause events</div>
        </div>

        <div className="argus-stat-item">
          <div className="stat-item-lbl">Position Turnovers (cTurn)</div>
          <div className="stat-item-val-row">
            <span className="stat-item-val purple-val">{cTurn}</span>
          </div>
          <div className="stat-item-sub">Body rotations</div>
        </div>

        <div className="argus-stat-item">
          <div className="stat-item-lbl">Large Movements (cLarge)</div>
          <div className="stat-item-val-row">
            <span className="stat-item-val amber-val">{cLarge}</span>
          </div>
          <div className="stat-item-sub">Major motion spikes</div>
        </div>

        <div className="argus-stat-item">
          <div className="stat-item-lbl">Micro Tremors (cMinor)</div>
          <div className="stat-item-val-row">
            <span className="stat-item-val">{cMinor}</span>
          </div>
          <div className="stat-item-sub">Micro movements</div>
        </div>
      </div>
    </section>
  );
}
