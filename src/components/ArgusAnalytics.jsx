import React from "react";
import {
  formatDisturbance,
  formatAbnormal,
  formatRating,
  formatSleepState,
  getNightlyData,
} from "../utils/argusEnums.js";

export default function ArgusAnalytics({ live }) {
  const nightly = getNightlyData(live);

  const {
    sApnea,
    sDeep,
    sExit,
    sHeart,
    sOOB,
    sResp,
    sScore,
    sShallow,
    sSleepTime,
    sTurn,
    sWake,
  } = nightly;

  const disturbanceStr = formatDisturbance(live?.disturbance ?? live?.eSleepDisturbances ?? live?.sDisturbance ?? 3);
  const abnormalStr = formatAbnormal(live?.abnormal ?? live?.eAbnormalStruggle ?? live?.struggle ?? 0);
  const ratingStr = formatRating(live?.rating ?? live?.quality ?? 0);
  const sleepStateStr = formatSleepState(live?.sleepState ?? 3);

  const hours = Math.floor(sSleepTime / 60);
  const mins = sSleepTime % 60;
  const durationStr = `${hours}h ${mins}m`;

  return (
    <div className="argus-analytics-container">
      {/* 1. Nightly Session Breakdown */}
      <section className="analytics-section">
        <h2 className="argus-section-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.2">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>Nightly Session Breakdown (Telemetry)</span>
        </h2>

        <div className="analytics-hero-grid">
          <div className="analytics-hero-card">
            <span className="hero-card-lbl">Total Sleep Duration</span>
            <div className="hero-card-val-row">
              <span className="hero-card-val">{durationStr}</span>
            </div>
            <span className="hero-card-sub">{sSleepTime} minutes recorded (sSleepTime)</span>
          </div>

          <div className="analytics-hero-card">
            <span className="hero-card-lbl">Deep Rest Ratio</span>
            <div className="hero-card-val-row">
              <span className="hero-card-val cyan-val">{sDeep}%</span>
            </div>
            <span className="hero-card-sub">Restorative sleep (sDeep)</span>
          </div>

          <div className="analytics-hero-card">
            <span className="hero-card-lbl">Light Rest Ratio</span>
            <div className="hero-card-val-row">
              <span className="hero-card-val emerald-val">{sShallow}%</span>
            </div>
            <span className="hero-card-sub">Light sleep phase (sShallow)</span>
          </div>

          <div className="analytics-hero-card">
            <span className="hero-card-lbl">Awake Duration</span>
            <div className="hero-card-val-row">
              <span className="hero-card-val amber-val">{sWake}m</span>
            </div>
            <span className="hero-card-sub">Awake period in bed (sWake)</span>
          </div>

          <div className="analytics-hero-card">
            <span className="hero-card-lbl">Out of Bed Time</span>
            <div className="hero-card-val-row">
              <span className="hero-card-val rose-val">{sOOB}m</span>
            </div>
            <span className="hero-card-sub">Minutes out of bed (sOOB)</span>
          </div>

          <div className="analytics-hero-card">
            <span className="hero-card-lbl">Nightly Score</span>
            <div className="hero-card-val-row">
              <span className="hero-card-val purple-val">{sScore}</span>
              <span style={{ fontSize: "14px", color: "var(--text-muted)", marginLeft: "4px" }}>/100</span>
            </div>
            <span className="hero-card-sub">Overall night rating (sScore)</span>
          </div>
        </div>
      </section>

      {/* 2. Nightly Disruptions & Session Averages */}
      <section className="analytics-section">
        <h2 className="argus-section-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.2">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          <span>Disruptions & Session Averages</span>
        </h2>

        <div className="analytics-grid">
          <div className="argus-stat-item">
            <div className="stat-item-lbl">Apnea Disruptions (sApnea)</div>
            <div className="stat-item-val-row">
              <span className="stat-item-val rose-val">{sApnea}</span>
            </div>
            <div className="stat-item-sub">Breathing pause events</div>
          </div>

          <div className="argus-stat-item">
            <div className="stat-item-lbl">Bed Exits (sExit)</div>
            <div className="stat-item-val-row">
              <span className="stat-item-val amber-val">{sExit}</span>
            </div>
            <div className="stat-item-sub">Times exited bed</div>
          </div>

          <div className="argus-stat-item">
            <div className="stat-item-lbl">Turnovers (sTurn)</div>
            <div className="stat-item-val-row">
              <span className="stat-item-val purple-val">{sTurn}</span>
            </div>
            <div className="stat-item-sub">Position rotations</div>
          </div>

          <div className="argus-stat-item">
            <div className="stat-item-lbl">Avg Cardiac Rate (sHeart)</div>
            <div className="stat-item-val-row">
              <span className="stat-item-val cyan-val">{sHeart}</span>
              <span className="stat-item-unit">BPM</span>
            </div>
            <div className="stat-item-sub">Session average heart rate</div>
          </div>

          <div className="argus-stat-item">
            <div className="stat-item-lbl">Avg Respiration (sResp)</div>
            <div className="stat-item-val-row">
              <span className="stat-item-val emerald-val">{sResp}</span>
              <span className="stat-item-unit">RPM</span>
            </div>
            <div className="stat-item-sub">Session average breathing</div>
          </div>

          <div className="argus-stat-item">
            <div className="stat-item-lbl">Disturbance (eSleepDisturbances)</div>
            <div className="stat-item-val-row">
              <span className="stat-item-val rose-val" style={{ fontSize: "13px", fontWeight: "700" }}>{disturbanceStr}</span>
            </div>
            <div className="stat-item-sub">Firmware sleep disturbance</div>
          </div>

          <div className="argus-stat-item">
            <div className="stat-item-lbl">Struggle Status (eAbnormalStruggle)</div>
            <div className="stat-item-val-row">
              <span className="stat-item-val amber-val" style={{ fontSize: "13px", fontWeight: "700" }}>{abnormalStr}</span>
            </div>
            <div className="stat-item-sub">Firmware struggle monitor</div>
          </div>

          <div className="argus-stat-item">
            <div className="stat-item-lbl">Quality Rating (eSleepQualityRating)</div>
            <div className="stat-item-val-row">
              <span className="stat-item-val cyan-val" style={{ fontSize: "13px", fontWeight: "700" }}>{ratingStr}</span>
            </div>
            <div className="stat-item-sub">Sleep quality index</div>
          </div>
        </div>
      </section>

      {/* Automated Diagnostic Insight Box */}
      <div className="argus-insight-box">
        <div className="insight-box-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" strokeWidth="3" />
          </svg>
          <span className="insight-box-title">ARGUS TELEMETRY DIAGNOSTIC</span>
        </div>
        <p className="insight-box-body">
          Current State: {sleepStateStr} phase. Sleep Score: <strong>{sScore}/100</strong> ({durationStr} recorded). Sleep Rating: <strong>{ratingStr}</strong>. Disturbance Status: <strong>{disturbanceStr}</strong>. Struggle Status: <strong>{abnormalStr}</strong>. Sensor telemetry active.
        </p>
      </div>
    </div>
  );
}


