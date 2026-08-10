import React from "react";

export default function TonightSection({ live }) {
  const inBedMin = live?.sOOB ?? 0;
  const asleepMin = live?.sSleepTime ?? 0;
  const deepMin = live?.sDeep ?? 0;
  const lightMin = live?.sShallow ?? 0;

  const exitCount = live?.sExit ?? 0;
  const turnovers = live?.cTurn ?? 0;

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
          <span className="small-card-lbl">IN BED</span>
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
            <span className="small-card-unit">min</span>
          </div>
        </div>

        <div className="small-metric-card">
          <span className="small-card-lbl">LIGHT</span>
          <div className="small-card-val-group">
            <span className="small-card-num cyan-text">{lightMin}</span>
            <span className="small-card-unit">min</span>
          </div>
        </div>
      </div>

      {/* Bottom 2 Split Cards */}
      <div className="tonight-split-row">
        {/* Left List Card */}
        <div className="card-box tonight-left-card">
          <div className="state-row">
            <span className="state-lbl">Fell asleep after</span>
            <span className="state-val">{asleepMin > 0 ? "5 min" : "-"}</span>
          </div>
          <div className="state-row">
            <span className="state-lbl">Awakenings</span>
            <span className="state-val">{exitCount}</span>
          </div>
          <div className="state-row no-border">
            <span className="state-lbl">Turnovers</span>
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
