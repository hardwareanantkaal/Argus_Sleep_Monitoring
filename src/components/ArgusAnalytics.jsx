import React from "react";

export default function ArgusAnalytics({ live }) {
  const sleepTimeMin = live?.sSleepTime ?? 0;
  const deepPct = live?.sDeep ?? 0;
  const shallowPct = live?.sShallow ?? 0;
  const exitCount = live?.sExit ?? 0;
  const turnovers = live?.cTurn ?? 0;
  const apnea = live?.cApnea ?? 0;
  const cHeart = live?.cHeart || live?.heartRate || 0;
  const cResp = live?.cResp || live?.breathRate || 0;

  const hours = Math.floor(sleepTimeMin / 60);
  const mins = sleepTimeMin % 60;
  const durationStr = `${hours}h ${mins}m`;

  return (
    <div className="argus-analytics-container">
      {/* Session Overview Section */}
      <section className="analytics-section">
        <h2 className="argus-section-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.2">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>Sleep Session Overview</span>
        </h2>

        <div className="analytics-hero-grid">
          <div className="analytics-hero-card">
            <span className="hero-card-lbl">Total Sleep Duration</span>
            <div className="hero-card-val-row">
              <span className="hero-card-val">{durationStr}</span>
            </div>
            <span className="hero-card-sub">{sleepTimeMin} minutes recorded</span>
          </div>

          <div className="analytics-hero-card">
            <span className="hero-card-lbl">Deep Rest Ratio</span>
            <div className="hero-card-val-row">
              <span className="hero-card-val cyan-val">{deepPct}%</span>
            </div>
            <span className="hero-card-sub">Restorative sleep phase</span>
          </div>

          <div className="analytics-hero-card">
            <span className="hero-card-lbl">Light Rest Ratio</span>
            <div className="hero-card-val-row">
              <span className="hero-card-val emerald-val">{shallowPct}%</span>
            </div>
            <span className="hero-card-sub">Light sleep phase</span>
          </div>

          <div className="analytics-hero-card">
            <span className="hero-card-lbl">Bed Exits</span>
            <div className="hero-card-val-row">
              <span className="hero-card-val amber-val">{exitCount}</span>
            </div>
            <span className="hero-card-sub">Times exited bed</span>
          </div>
        </div>
      </section>

      {/* Composite Rolling Metrics Grid */}
      <section className="analytics-section">
        <h2 className="argus-section-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.2">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          <span>Composite Telemetry (Rolling Averages)</span>
        </h2>

        <div className="analytics-grid">
          <div className="argus-stat-item">
            <div className="stat-item-lbl">Avg Respiration</div>
            <div className="stat-item-val-row">
              <span className="stat-item-val cyan-val">{cResp}</span>
              <span className="stat-item-unit">RPM</span>
            </div>
            <div className="stat-item-sub">Breathing frequency</div>
          </div>

          <div className="argus-stat-item">
            <div className="stat-item-lbl">Avg Cardiac Rate</div>
            <div className="stat-item-val-row">
              <span className="stat-item-val emerald-val">{cHeart}</span>
              <span className="stat-item-unit">BPM</span>
            </div>
            <div className="stat-item-sub">Heartbeat frequency</div>
          </div>

          <div className="argus-stat-item">
            <div className="stat-item-lbl">Position Turnovers</div>
            <div className="stat-item-val-row">
              <span className="stat-item-val purple-val">{turnovers}</span>
            </div>
            <div className="stat-item-sub">Body rotations</div>
          </div>

          <div className="argus-stat-item">
            <div className="stat-item-lbl">Apnea Disruptions</div>
            <div className="stat-item-val-row">
              <span className="stat-item-val rose-val">{apnea}</span>
            </div>
            <div className="stat-item-sub">Breathing pause events</div>
          </div>

          <div className="argus-stat-item">
            <div className="stat-item-lbl">Minor Tremors</div>
            <div className="stat-item-val-row">
              <span className="stat-item-val">{live?.cMinor ?? 0}</span>
            </div>
            <div className="stat-item-sub">Micro movements</div>
          </div>

          <div className="argus-stat-item">
            <div className="stat-item-lbl">Large Movements</div>
            <div className="stat-item-val-row">
              <span className="stat-item-val amber-val">{live?.cLarge ?? 0}</span>
            </div>
            <div className="stat-item-sub">Major motion spikes</div>
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
          Session status: {durationStr} recorded. {deepPct}% deep sleep ratio with {exitCount} bed exit events and {apnea} apnea pauses detected. Sensor link is active.
        </p>
      </div>
    </div>
  );
}
