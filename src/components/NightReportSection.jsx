import React from "react";

export default function NightReportSection({ live }) {
  const score = live?.sScore ?? 60;
  const totalSleepMin = live?.sSleepTime ?? 17;
  const deepPct = live?.sDeep ?? 0;
  const lightPct = live?.sShallow ?? 100;
  const efficiency = live?.quality !== undefined ? live.quality : 100;

  const inBedHours = Math.floor(totalSleepMin / 60);
  const inBedMins = totalSleepMin % 60;
  const inBedStr = `${inBedHours}h ${inBedMins}m`;

  const awakenings = live?.sExit ?? 0;
  const turnovers = live?.cTurn ?? 0;
  const apnea = live?.cApnea ?? 0;

  const avgHeart = live?.cHeart || live?.heartRate || 78;
  const avgResp = live?.cResp || live?.breathRate || 16;

  const todayStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

  return (
    <div className="dashboard-section night-report-section">
      <div className="section-header-row">
        <span className="purple-dot" />
        <h2 className="section-title-bold">Night Report</h2>
        <span className="section-subtitle-muted">· {todayStr} · {timeStr}</span>
      </div>

      {/* Top 4 Summary Metric Cards */}
      <div className="night-report-cards-row">
        <div className="small-metric-card">
          <span className="small-card-lbl">SCORE</span>
          <div className="small-card-val-group">
            <span className="small-card-num">{score}</span>
          </div>
        </div>

        <div className="small-metric-card">
          <span className="small-card-lbl">TOTAL SLEEP</span>
          <div className="small-card-val-group">
            <span className="small-card-num">{totalSleepMin}</span>
            <span className="small-card-unit">min</span>
          </div>
        </div>

        <div className="small-metric-card">
          <span className="small-card-lbl">EFFICIENCY</span>
          <div className="small-card-val-group">
            <span className="small-card-num">{efficiency}</span>
            <span className="small-card-unit">%</span>
          </div>
        </div>

        <div className="small-metric-card">
          <span className="small-card-lbl">DEEP</span>
          <div className="small-card-val-group">
            <span className="small-card-num purple-text">{deepPct}</span>
            <span className="small-card-unit">%</span>
          </div>
        </div>
      </div>

      {/* Middle 3 Split List Cards */}
      <div className="night-report-split-grid">
        {/* Card 1: Time Breakdown */}
        <div className="card-box">
          <div className="state-row">
            <span className="state-lbl">In bed</span>
            <span className="state-val">{inBedStr}</span>
          </div>
          <div className="state-row">
            <span className="state-lbl">Awake</span>
            <span className="state-val">0h 0m</span>
          </div>
          <div className="state-row no-border">
            <span className="state-lbl">Fell asleep after</span>
            <span className="state-val">0 min</span>
          </div>
        </div>

        {/* Card 2: Disruptions */}
        <div className="card-box">
          <div className="state-row">
            <span className="state-lbl">Awakenings</span>
            <span className="state-val">{awakenings}</span>
          </div>
          <div className="state-row">
            <span className="state-lbl">Turnovers</span>
            <span className="state-val">{turnovers}</span>
          </div>
          <div className="state-row no-border">
            <span className="state-lbl">Apnea events</span>
            <span className="state-val">{apnea}</span>
          </div>
        </div>

        {/* Card 3: Vitals & Sleep Distribution */}
        <div className="card-box">
          <div className="state-row">
            <span className="state-lbl">Avg heart rate</span>
            <span className="state-val">{avgHeart} bpm</span>
          </div>
          <div className="state-row">
            <span className="state-lbl">Avg respiration</span>
            <span className="state-val">{avgResp} rpm</span>
          </div>
          <div className="state-row no-border">
            <span className="state-lbl">Light sleep</span>
            <span className="state-val">{lightPct} %</span>
          </div>
        </div>
      </div>

      {/* Bottom Insight Box */}
      <div className="card-box insight-banner-box">
        <span className="insight-lbl">INSIGHT</span>
        <p className="insight-text">
          Solid session: {inBedStr} asleep, {efficiency}% efficiency, {deepPct}% deep, {awakenings} awakenings. Keep this rhythm going.
        </p>
      </div>
    </div>
  );
}
