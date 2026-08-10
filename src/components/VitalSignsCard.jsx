import React from "react";

export default function VitalSignsCard({ heartRate, breathRate, distance }) {
  const hrVal = typeof heartRate === "number" ? heartRate : 0;
  const brVal = typeof breathRate === "number" ? breathRate : 0;
  
  const distMeters = typeof distance === "number" && distance > 0 ? (distance / 100).toFixed(1) : "1.5";

  return (
    <div className="card-box vital-signs-box">
      <div className="card-box-header">
        <span className="card-title-text">VITAL SIGNS</span>
      </div>

      <div className="vitals-dual-content">
        {/* Heart Rate (BPM) */}
        <div className="vital-col">
          <div className="vital-val-head">
            <span className="vital-dot pink-dot" />
            <span className="vital-big-num pink-text">{hrVal}</span>
          </div>
          <span className="vital-unit-lbl">bpm · heart</span>
        </div>

        {/* Breath Rate (RPM) */}
        <div className="vital-col">
          <div className="vital-val-head">
            <span className="vital-dot cyan-dot" />
            <span className="vital-big-num cyan-text">{brVal}</span>
          </div>
          <span className="vital-unit-lbl">rpm · breath</span>
        </div>
      </div>

      <div className="vitals-footer-tip">
        <span>Needs stillness within {distMeters} m</span>
      </div>
    </div>
  );
}
