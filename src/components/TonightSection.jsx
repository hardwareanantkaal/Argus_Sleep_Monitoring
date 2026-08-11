import React from "react";
import { getNightlyData } from "../utils/argusEnums.js";

export default function TonightSection({ live }) {
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

  const inBedMin = sOOB;
  const asleepMin = sSleepTime;
  const deepMin = sDeep;
  const lightMin = sShallow;

  const exitCount = sExit;
  const turnovers = sTurn;

  const isTracking = live?.inBed || live?.sleepState < 3;

  return (
    <div className="dashboard-section tonight-section">
      <div className="section-header-row">
        <span className="purple-dot" />
        <h2 className="section-title-bold">Tonight</h2>
        <span className="section-subtitle-muted">
          {isTracking ? "· tracking session active" : "· waiting for bed"}
        </span>
      </div>

      {/* Top 4 Metric Cards */}
      <div className="tonight-cards-row">
        <div className="small-metric-card">
          <span className="small-card-lbl">OUT OF BED</span>
          <div className="small-card-val-group">
            <span className="small-card-num">{inBedMin}</span>
            <span className="small-card-unit">min</span>
          </div>
        </div>

        <div className="small-metric-card">
          <span className="small-card-lbl">ASLEEP</span>
          <div className="small-card-val-group">
            <span className="small-card-num">{asleepMin}</span>
            <span className="small-card-unit">min</span>
          </div>
        </div>

        <div className="small-metric-card">
          <span className="small-card-lbl">DEEP</span>
          <div className="small-card-val-group">
            <span className="small-card-num purple-text">{deepMin}</span>
            <span className="small-card-unit">%</span>
          </div>
        </div>

        <div className="small-metric-card">
          <span className="small-card-lbl">LIGHT</span>
          <div className="small-card-val-group">
            <span className="small-card-num cyan-text">{lightMin}</span>
            <span className="small-card-unit">%</span>
          </div>
        </div>
      </div>

      {/* Bottom 2 Split Cards */}
      <div className="tonight-split-row">
        {/* Left List Card */}
        <div className="card-box tonight-left-card">
          <div className="state-row">
            <span className="state-lbl">Awake duration (sWake)</span>
            <span className="state-val">{sWake} min</span>
          </div>
          <div className="state-row">
            <span className="state-lbl">Awakenings (sExit)</span>
            <span className="state-val">{exitCount}</span>
          </div>
          <div className="state-row no-border">
            <span className="state-lbl">Turnovers (sTurn)</span>
            <span className="state-val">{turnovers}</span>
          </div>
        </div>

        {/* Right Info Box */}
        <div className="card-box tonight-info-card">
          <p className="tonight-info-text">
            {isTracking
              ? `Session active — sensor unit is tracking sleep stages, breathing rhythm, and movement dynamics in real time.`
              : `No session — lie in bed and stay still; tracking starts within a minute.`}
          </p>
        </div>
      </div>
    </div>
  );
}

