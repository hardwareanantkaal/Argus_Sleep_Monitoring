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
            <span className="argus-app-tagline">
              {deviceId ? `NODE · ${deviceId}` : "60GHz RADAR TELEMETRY"}
            </span>
          </div>
        </div>

        <div className="argus-header-right">
          {configMode && (
            <span className="argus-chip-small amber-chip" title="Config Mode Active">
              CONFIG MODE ACTIVE
            </span>
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
