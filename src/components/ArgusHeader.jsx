import React from "react";
import { Link } from "react-router-dom";

export default function ArgusHeader({
  deviceName,
  deviceId,
  online,
  lastSeenText,
  rssi,
  configMode = false,
  showBack = true,
  onOpenPlacementCheck,
  onToggleConfigMode,
}) {
  const localTimeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="argus-header-sticky-wrapper">
      <header className="argus-header">
        <div className="argus-header-left">
          {showBack && (
            <Link to="/" className="argus-back-btn" title="Return to All Monitors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span className="back-btn-text">Monitors</span>
            </Link>
          )}

          {/* Custom Argus Radar Eye Logo */}
          <div className="argus-brand-logo">
            <svg width="34" height="34" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="10" fill="url(#argusGrad)" />
              <circle cx="16" cy="16" r="8" stroke="#ffffff" strokeWidth="2" strokeDasharray="3 2" />
              <circle cx="16" cy="16" r="3" fill="#ffffff" />
              <defs>
                <linearGradient id="argusGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#06b6d4" />
                  <stop offset="1" stopColor="#6366f1" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div className="argus-brand-text">
            <h1 className="argus-app-title">{deviceName || "Argus Sleep Monitor"}</h1>
            <span className="argus-app-tagline">60GHz RADAR TELEMETRY {deviceId ? `· ${deviceId}` : ""}</span>
          </div>
        </div>

        <div className="argus-header-right">
          {/* Config Mode Toggle Button */}
          {onToggleConfigMode && (
            <button
              className={`argus-config-mode-btn ${configMode ? "active" : ""}`}
              onClick={() => onToggleConfigMode(!configMode)}
              title={configMode ? "Exit Configuration Mode" : "Start Configuration Mode (OTA / WiFi Update)"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>{configMode ? "Exit Config" : "Config Mode"}</span>
            </button>
          )}

          {/* Placement Check Button */}
          {onOpenPlacementCheck && (
            <button
              className="argus-placement-check-btn"
              onClick={onOpenPlacementCheck}
              title="Run Placement & Signal Calibration Check"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>Placement Check</span>
            </button>
          )}

          <div className={`argus-status-chip ${online ? "online" : "offline"}`}>
            <span className="argus-status-dot" />
            <span className="argus-status-label">{online ? "LIVE STREAM" : "OFFLINE"}</span>
          </div>

          <div className="argus-header-metrics">
            <span className="header-time-text">{localTimeStr}</span>
            {rssi !== undefined && <span className="dim-divider">·</span>}
            {rssi !== undefined && <span className="header-rssi-text">{rssi} dBm</span>}
            <span className="dim-divider">·</span>
            <span className="header-uptime-text">{statusText(online, lastSeenText)}</span>
          </div>
        </div>
      </header>
    </div>
  );
}

function statusText(online, lastSeenText) {
  if (online) return `Updated ${lastSeenText || "just now"}`;
  return `Last seen ${lastSeenText || "recently"}`;
}
