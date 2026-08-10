import React from "react";
import { Link } from "react-router-dom";

export default function SleepLampHeader({ deviceName, deviceId, online, lastSeenText, rssi, showBack = true }) {
  const localTimeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

  return (
    <div className="sleeplamp-header">
      <div className="header-left">
        {showBack && (
          <Link to="/" className="header-back-btn" title="Back to All Devices">
            &larr;
          </Link>
        )}
        {/* Planet Logo Icon */}
        <div className="planet-icon">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="10" fill="url(#planetGlow)" />
            <ellipse cx="16" cy="16" rx="15" ry="5" stroke="rgba(255, 255, 255, 0.6)" strokeWidth="1.5" transform="rotate(-20 16 16)" />
            <defs>
              <radialGradient id="planetGlow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(12 12) scale(14)">
                <stop stopColor="#e0e7ff" />
                <stop offset="0.6" stopColor="#818cf8" />
                <stop offset="1" stopColor="#4338ca" />
              </radialGradient>
            </defs>
          </svg>
        </div>

        <div className="header-titles">
          <h1 className="header-brand-name">{deviceName || "SleepLamp"}</h1>
          <span className="header-subtitle">CONTACTLESS SLEEP MONITOR {deviceId ? `· ${deviceId}` : ""}</span>
        </div>
      </div>

      <div className="header-status-pill">
        <span className={`status-live-dot ${online ? "online" : "offline"}`} />
        <span className="status-live-text">{online ? "live" : "offline"}</span>
        <span className="header-divider">·</span>
        <span className="header-time">{localTimeStr}</span>
        {rssi !== undefined && (
          <>
            <span className="header-divider">·</span>
            <span className="header-signal">signal <strong>{rssi}dBm</strong></span>
          </>
        )}
        <span className="header-divider">·</span>
        <span className="header-up">up {lastSeenText || "0m"}</span>
      </div>
    </div>
  );
}
