import React from "react";

export default function DeviceSettingsPanel({
  configMode,
  onToggleConfigMode,
  onOpenPlacementCheck,
  updatingConfig,
  online = true,
}) {
  return (
    <section className="settings-panel-section">
      <h2 className="argus-section-title">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
        <span>Device Controls & Sensor Settings</span>
      </h2>

      <div className="settings-controls-grid">
        {/* 1. Placement Check Setting Button */}
        <div
          className={`setting-control-card ${!online ? "disabled-offline" : ""}`}
          onClick={() => online && onOpenPlacementCheck()}
          style={{
            cursor: online ? "pointer" : "not-allowed",
            opacity: online ? 1 : 0.55,
          }}
        >
          <div className="control-card-icon purple-bg">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div className="control-card-info">
            <h3 className="control-title">Placement Check</h3>
            <p className="control-desc">
              {online
                ? "Inspect radar positioning & signal alignment score"
                : "Unavailable — Turn on device to run placement check"}
            </p>
          </div>
          <button className="control-action-btn primary-action" disabled={!online}>
            <span>{online ? "Run Check" : "Device Offline"}</span>
            {online && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            )}
          </button>
        </div>

        {/* 2. Config Mode (WiFi / OTA Update) Setting Button */}
        <div
          className={`setting-control-card ${configMode ? "active-amber-border" : ""} ${!online ? "disabled-offline" : ""}`}
          onClick={() => online && !updatingConfig && onToggleConfigMode(!configMode)}
          style={{
            cursor: online ? "pointer" : "not-allowed",
            opacity: online ? 1 : 0.55,
          }}
        >
          <div className={`control-card-icon ${configMode ? "amber-bg" : "cyan-bg"}`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </div>
          <div className="control-card-info">
            <h3 className="control-title">Config Mode (WiFi / OTA)</h3>
            <p className="control-desc">
              {!online
                ? "Unavailable — Turn on device to switch config mode"
                : configMode
                ? "Active — Access Point & OTA firmware mode enabled"
                : "Enable Access Point pairing & OTA firmware mode"}
            </p>
          </div>
          <button
            className={`control-action-btn ${configMode ? "amber-action" : "secondary-action"}`}
            disabled={!online || updatingConfig}
          >
            <span>{!online ? "Device Offline" : updatingConfig ? "Updating..." : configMode ? "Exit Config" : "Start Config"}</span>
          </button>
        </div>
      </div>
    </section>
  );
}

