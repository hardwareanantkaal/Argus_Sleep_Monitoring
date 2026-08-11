import React from "react";
import { getNightlyData, formatRating, formatSleepState } from "../utils/argusEnums.js";
import ArgusSleepGauge from "./ArgusSleepGauge.jsx";

export default function NightlySection({ live }) {
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

  const ratingStr = formatRating(live?.rating ?? live?.quality ?? 0);
  const sleepStateStr = formatSleepState(live?.sleepState ?? 3);

  const hours = Math.floor(sSleepTime / 60);
  const mins = sSleepTime % 60;
  const durationStr = `${hours}h ${mins}m`;

  return (
    <section className="dashboard-section nightly-section">
      <div className="section-header-row">
        <span className="section-badge emerald-bg">3. NIGHTLY</span>
        <h2 className="section-title-bold">Nightly Session Telemetry (nightly)</h2>
        <span className="section-subtitle-muted">· Overnight session parameters</span>
      </div>

      {/* Top Row: Sleep Quality Ring Gauge */}
      <div className="nightly-gauge-row" style={{ marginBottom: "20px" }}>
        <ArgusSleepGauge
          score={sScore}
          quality={live?.rating ?? live?.quality}
          deepPct={sDeep}
          sleepTimeMin={sSleepTime}
        />
      </div>

      {/* 11 Nightly Parameters Cards Grid */}
      <div className="nightly-telemetry-grid">
        <div className="analytics-hero-card">
          <span className="hero-card-lbl">Total Sleep Duration</span>
          <div className="hero-card-val-row">
            <span className="hero-card-val">{durationStr}</span>
          </div>
          <span className="hero-card-sub">{sSleepTime} minutes (sSleepTime)</span>
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
          <span className="hero-card-sub">Overall score (sScore)</span>
        </div>
      </div>

      {/* Nightly Disruptions & Averages */}
      <div className="nightly-secondary-grid" style={{ marginTop: "20px" }}>
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
          <div className="stat-item-lbl">Position Turnovers (sTurn)</div>
          <div className="stat-item-val-row">
            <span className="stat-item-val purple-val">{sTurn}</span>
          </div>
          <div className="stat-item-sub">Body rotations</div>
        </div>

        <div className="argus-stat-item">
          <div className="stat-item-lbl">Avg Cardiac Rate (sHeart)</div>
          <div className="stat-item-val-row">
            <span className="stat-item-val cyan-val">{sHeart}</span>
            <span className="stat-item-unit">BPM</span>
          </div>
          <div className="stat-item-sub">Nightly heart rate average</div>
        </div>

        <div className="argus-stat-item">
          <div className="stat-item-lbl">Avg Respiration (sResp)</div>
          <div className="stat-item-val-row">
            <span className="stat-item-val emerald-val">{sResp}</span>
            <span className="stat-item-unit">RPM</span>
          </div>
          <div className="stat-item-sub">Nightly respiration average</div>
        </div>
      </div>

      {/* Automated Diagnostic Insight Box */}
      <div className="argus-insight-box" style={{ marginTop: "20px" }}>
        <div className="insight-box-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" strokeWidth="3" />
          </svg>
          <span className="insight-box-title">ARGUS NIGHTLY TELEMETRY SUMMARY</span>
        </div>
        <p className="insight-box-body">
          Recorded Nightly Session: <strong>{durationStr}</strong> asleep, <strong>{sScore}/100</strong> score rating. Deep sleep: <strong>{sDeep}%</strong>, Light sleep: <strong>{sShallow}%</strong>, Awake duration: <strong>{sWake}m</strong>. Disruptions recorded: <strong>{sApnea}</strong> apnea events, <strong>{sExit}</strong> bed exits, and <strong>{sTurn}</strong> turnovers.
        </p>
      </div>
    </section>
  );
}
