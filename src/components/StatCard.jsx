import React from "react";

export default function StatCard({ label, value, subText, accentColor = "indigo" }) {
  return (
    <div className={`cyber-stat-card accent-${accentColor}`}>
      <div className="stat-label-row">
        <span className="stat-label-text">{label}</span>
      </div>
      <div className="stat-value-text">{value ?? "—"}</div>
      {subText && <div className="stat-sub-text">{subText}</div>}
    </div>
  );
}
