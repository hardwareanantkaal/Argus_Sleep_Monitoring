/**
 * Argus Firmware Enum Mappings & Formatting Utilities
 * Exactly aligned with Firmware definitions.
 */

// 1. sleepState (also live.sleepState in firmware)
// 0 = Deep sleep
// 1 = Light sleep
// 2 = Awake
// 3 = None
export const SLEEP_STATE_MAP = {
  0: "Deep sleep",
  1: "Light sleep",
  2: "Awake",
  3: "None",
};

export function formatSleepState(val) {
  if (val === undefined || val === null) return "None";
  const num = Number(val);
  return SLEEP_STATE_MAP[num] ?? "None";
}

// 2. inBed
// 0 = Out of bed
// 1 = In bed
export const IN_BED_MAP = {
  0: "Out of bed",
  1: "In bed",
};

export function formatInBed(val) {
  if (val === undefined || val === null) return "Out of bed";
  if (val === true || val === "true") return "In bed";
  if (val === false || val === "false") return "Out of bed";
  const num = Number(val);
  return IN_BED_MAP[num] ?? "Out of bed";
}

// 3. presence
// 0 = No one
// 1 = Someone is present
export const PRESENCE_MAP = {
  0: "No one",
  1: "Someone is present",
};

export function formatPresence(val) {
  if (val === undefined || val === null) return "No one";
  if (val === true || val === "true") return "Someone is present";
  if (val === false || val === "false") return "No one";
  const num = Number(val);
  return PRESENCE_MAP[num] ?? "No one";
}

// 4. disturbance (eSleepDisturbances)
// 0 = Sleep duration less than 4 hours
// 1 = Sleep duration more than 12 hours
// 2 = Long-time abnormal absence of person
// 3 = None
export const DISTURBANCE_MAP = {
  0: "Sleep duration less than 4 hours",
  1: "Sleep duration more than 12 hours",
  2: "Long-time abnormal absence of person",
  3: "None",
};

export function formatDisturbance(val) {
  if (val === undefined || val === null) return "None";
  const num = Number(val);
  return DISTURBANCE_MAP[num] ?? "None";
}

// 5. rating (eSleepQualityRating)
// 0 = None
// 1 = Good sleep quality
// 2 = Average sleep quality
// 3 = Poor sleep quality
export const RATING_MAP = {
  0: "None",
  1: "Good sleep quality",
  2: "Average sleep quality",
  3: "Poor sleep quality",
};

export function formatRating(val) {
  if (val === undefined || val === null) return "None";
  const num = Number(val);
  if (!isNaN(num) && RATING_MAP[num] !== undefined) {
    return RATING_MAP[num];
  }
  if (typeof val === "string") return val;
  return "None";
}

// 6. abnormal (eAbnormalStruggle)
// 0 = None
// 1 = Normal status
// 2 = Abnormal struggle status
export const ABNORMAL_MAP = {
  0: "None",
  1: "Normal status",
  2: "Abnormal struggle status",
};

export function formatAbnormal(val) {
  if (val === undefined || val === null) return "None";
  const num = Number(val);
  return ABNORMAL_MAP[num] ?? "None";
}

// 7. Movement / Motion
// Must be seen strictly in NUMBER format, not text strings.
export function formatMovement(val) {
  if (val === undefined || val === null) return 0;
  const num = Number(val);
  return isNaN(num) ? 0 : num;
}

// 8. Safely extract all `nightly` object parameters from Firebase live payload
export function getNightlyData(live) {
  const n = live?.nightly || {};
  return {
    sApnea: n.sApnea ?? live?.sApnea ?? live?.cApnea ?? 0,
    sDeep: n.sDeep ?? live?.sDeep ?? 0,
    sExit: n.sExit ?? live?.sExit ?? 0,
    sHeart: n.sHeart ?? live?.sHeart ?? live?.cHeart ?? live?.heartRate ?? 0,
    sOOB: n.sOOB ?? live?.sOOB ?? 0,
    sResp: n.sResp ?? live?.sResp ?? live?.cResp ?? live?.breathRate ?? 0,
    sScore: n.sScore ?? live?.sScore ?? 0,
    sShallow: n.sShallow ?? live?.sShallow ?? 0,
    sSleepTime: n.sSleepTime ?? live?.sSleepTime ?? 0,
    sTurn: n.sTurn ?? live?.sTurn ?? live?.cTurn ?? 0,
    sWake: n.sWake ?? live?.sWake ?? 0,
  };
}

// 9. breathState (1–4: radar breath pattern classification)
export const BREATH_STATE_MAP = {
  1: "Normal Breath",
  2: "Fast Breath",
  3: "Slow Breath",
  4: "Irregular / Apnea Risk",
};

export function formatBreathState(val) {
  if (val === undefined || val === null || val === 0) return "Normal";
  const num = Number(val);
  return BREATH_STATE_MAP[num] ?? `Pattern ${num}`;
}

// 10. Extract live composite object parameters
export function getCompositeData(live) {
  const c = live?.composite || {};
  return {
    cResp: c.cResp ?? live?.cResp ?? live?.breathRate ?? 0,
    cHeart: c.cHeart ?? live?.cHeart ?? live?.heartRate ?? 0,
    cTurn: c.cTurn ?? live?.cTurn ?? 0,
    cLarge: c.cLarge ?? live?.cLarge ?? 0,
    cMinor: c.cMinor ?? live?.cMinor ?? 0,
    cApnea: c.cApnea ?? live?.cApnea ?? 0,
  };
}

// 11. Parse & sort sleepTimeline object by time keys (e.g. "HH:MM")
export function parseSleepTimeline(timelineObj) {
  if (!timelineObj || typeof timelineObj !== "object") return [];

  const sortedTimes = Object.keys(timelineObj).sort((a, b) => a.localeCompare(b));

  return sortedTimes.map((timeStr) => ({
    time: timeStr,
    stage: timelineObj[timeStr] || "None",
  }));
}

// 12. Get latest active stage from sorted timeline
export function getLatestTimelineStage(timelineObj) {
  const parsed = parseSleepTimeline(timelineObj);
  if (parsed.length === 0) return null;
  return parsed[parsed.length - 1];
}

// 13. Smart Fallback for Current Sleep Stage (reads live.sleepTimeline -> live.sleepState -> inBed)
export function getEffectiveLiveStage(live) {
  // 1. First priority: Latest entry from live.sleepTimeline (staging engine)
  const latestTimeline = getLatestTimelineStage(live?.sleepTimeline);
  if (latestTimeline && latestTimeline.stage && latestTimeline.stage !== "None") {
    return {
      stage: latestTimeline.stage,
      source: "Staging Engine",
      time: latestTimeline.time,
    };
  }

  // 2. Second priority: Fallback to live.sleepState (0=Deep, 1=Light, 2=Awake, 3=None)
  const rawSleepState = live?.sleepState;
  if (rawSleepState !== undefined && rawSleepState !== null && Number(rawSleepState) !== 3) {
    const formatted = formatSleepState(rawSleepState);
    if (formatted && formatted !== "None") {
      return {
        stage: formatted,
        source: "Radar Sensor",
        time: "Live Feed",
      };
    }
  }

  // 3. Third priority: Presence / Bed Occupancy state
  if (live?.inBed === 1 || live?.inBed === true || live?.inBed === "1") {
    return {
      stage: "Awake",
      source: "Bed Sensor",
      time: "In Bed",
    };
  }

  return {
    stage: "None",
    source: "Idle",
    time: "Awaiting Session",
  };
}



