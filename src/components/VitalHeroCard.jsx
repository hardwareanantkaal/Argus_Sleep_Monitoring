import React from "react";

export default function VitalHeroCard({
  title,
  value,
  unit,
  subtitle,
  iconType,
  themeColor = "cyan",
  statusBadge,
  animated = false,
}) {
  const getIcon = () => {
    switch (iconType) {
      case "heart":
        return (
          <svg className={`vital-icon ${animated ? "pulse-heart" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        );
      case "breath":
        return (
          <svg className={`vital-icon ${animated ? "breath-wave" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 12c-3 0-5 2.5-5 5.5s2 5.5 5 5.5 5-2.5 5-5.5-2-5.5-5-5.5z" />
            <path d="M12 2C6.5 2 2 6.5 2 12c0 2.5 1 4.5 2.5 6" />
            <path d="M22 12c0-5.5-4.5-10-10-10" />
          </svg>
        );
      case "bed":
        return (
          <svg className="vital-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 4v16" />
            <path d="M2 8h18a2 2 0 0 1 2 2v10" />
            <path d="M2 17h20" />
            <path d="M6 8v9" />
            <circle cx="7" cy="11" r="1.5" />
          </svg>
        );
      case "moon":
        return (
          <svg className="vital-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        );
      case "activity":
      default:
        return (
          <svg className="vital-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        );
    }
  };

  return (
    <div className={`vital-hero-card theme-${themeColor}`}>
      <div className="vital-card-top">
        <div className="vital-title-wrap">
          <div className="vital-icon-container">{getIcon()}</div>
          <span className="vital-card-title">{title}</span>
        </div>
        {statusBadge && <span className="vital-status-pill">{statusBadge}</span>}
      </div>

      <div className="vital-card-body">
        <div className="vital-value-group">
          <span className="vital-main-value">{value ?? "—"}</span>
          {unit && <span className="vital-unit">{unit}</span>}
        </div>

        {/* Pulse / Rhythm wave animation bar */}
        {animated && (
          <div className="vital-wave-anim">
            <span className="wave-bar b1"></span>
            <span className="wave-bar b2"></span>
            <span className="wave-bar b3"></span>
            <span className="wave-bar b4"></span>
            <span className="wave-bar b5"></span>
          </div>
        )}
      </div>

      {subtitle && <div className="vital-card-footer">{subtitle}</div>}
    </div>
  );
}
