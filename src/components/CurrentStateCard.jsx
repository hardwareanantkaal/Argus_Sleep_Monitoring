import React from "react";
import {
  formatSleepState,
  formatInBed,
  formatPresence,
  formatMovement,
} from "../utils/argusEnums.js";

export default function CurrentStateCard({ presence, inBed, motion, sleepState }) {
  const stageLabel = formatSleepState(sleepState);
  const presenceText = formatPresence(presence);
  const bedText = formatInBed(inBed);
  const movementVal = formatMovement(motion);
  const sessionText = formatInBed(inBed) === "In bed" || (typeof sleepState === "number" && sleepState < 3) ? "Active" : "—";

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
          <span className="state-lbl">Movement</span>
          <span className="state-val">{movementVal}</span>
        </div>
        <div className="state-row no-border">
          <span className="state-lbl">Session</span>
          <span className="state-val">{sessionText}</span>
        </div>
      </div>
    </div>
  );
}

