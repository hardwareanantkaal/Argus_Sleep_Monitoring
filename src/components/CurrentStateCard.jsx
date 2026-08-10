import React from "react";

const SLEEP_STATE_SHORT = ["Deep", "Light", "Awake", "Up"];
const MOTION_STATE = ["None", "Still", "Active"];

export default function CurrentStateCard({ presence, inBed, motion, sleepState }) {
  // Determine current stage pill
  let stageLabel = "Up";
  if (inBed) {
    stageLabel = SLEEP_STATE_SHORT[sleepState] ?? "In Bed";
  }

  const presenceText = presence ? "Present" : "None";
  const bedText = inBed ? "In" : "Out";
  const motionText = MOTION_STATE[motion] ?? "None";
  const sessionText = inBed || sleepState < 3 ? "Active" : "—";

  return (
    <div className="card-box current-state-box">
      <div className="card-box-header">
        <span className="card-title-text">CURRENT STATE</span>
      </div>

      <div className="state-top-pill-wrap">
        <div className="current-stage-pill">{stageLabel}</div>
      </div>

      <div className="state-list-rows">
        <div className="state-row">
          <span className="state-lbl">Presence</span>
          <span className="state-val">{presenceText}</span>
        </div>
        <div className="state-row">
          <span className="state-lbl">Bed</span>
          <span className="state-val">{bedText}</span>
        </div>
        <div className="state-row">
          <span className="state-lbl">Motion</span>
          <span className="state-val">{motionText}</span>
        </div>
        <div className="state-row no-border">
          <span className="state-lbl">Session</span>
          <span className="state-val">{sessionText}</span>
        </div>
      </div>
    </div>
  );
}
