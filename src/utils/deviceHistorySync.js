import {
  doc,
  collection,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { firestore } from "../firebase.js";
import { getDeviceTimestampMs } from "./status.js";

// Archived sleep sessions live in a public Firestore copy at
// deviceHistory/{deviceId}/history/{sessionId} — no account/ownership relation,
// keyed only by device — the destination of the "cut" performed by the
// 30-minute history sync job (see historySyncJob.js).
function sessionDocRef(deviceId, sessionId) {
  return doc(firestore, "deviceHistory", deviceId, "history", sessionId);
}

// Two RTDB history fragments are treated as one continuous sleep session when the
// gap between the earlier one's end and the later one's start is within this window
// (e.g. a brief WiFi drop/reconnect mid-night), instead of staying separate sessions.
export const SESSION_MERGE_GAP_MS = 15 * 60 * 1000; // 15 minutes

export function parseSessionTimeMs(timeStr) {
  if (timeStr === undefined || timeStr === null || timeStr === "") return null;
  return getDeviceTimestampMs(null, { timeStr });
}

// Formats a ms timestamp back into the "YYYY-MM-DD HH:mm:ss" convention
// startTime/endTime use, e.g. for anchoring smoothing against "now" when a
// session is still ongoing and has no fixed endTime yet.
export function toSessionTimeStr(ms) {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// sleepTimeline keys are bare "HH:mm" (no date) — unlike startTime/endTime, which
// are full "YYYY-MM-DD HH:mm" strings parseSessionTimeMs can handle directly.
// This anchors a bare time-of-day to whichever calendar day (the one referenceMs
// falls on, the day before, or the day after) puts it closest to referenceMs, so
// a session that happens to cross midnight still resolves correctly.
export function timeOfDayToMs(timeStr, referenceMs) {
  if (!timeStr || referenceMs === null || referenceMs === undefined) return null;
  const timePart = timeStr.includes(" ") ? timeStr.split(" ")[1] : timeStr;
  const match = /^(\d{1,2}):(\d{2})/.exec(timePart);
  if (!match) return null;
  const [, hStr, mStr] = match;
  const ref = new Date(referenceMs);
  const base = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate(), Number(hStr), Number(mStr), 0, 0).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  return [base - dayMs, base, base + dayMs].reduce((best, c) =>
    Math.abs(c - referenceMs) < Math.abs(best - referenceMs) ? c : best
  );
}

// The firmware sets inProgress: true when a session starts but doesn't reliably
// flip it back to false when the session ends, so a raw session.inProgress check
// can never age out on its own. endTime is only a periodic snapshot (refreshed
// by the ~30-minute sync job, not continuously), so it's always somewhat in the
// past even for a genuinely active session — requiring endTime >= now would
// reject almost every real session. Instead, treat it as still active if the
// flag is set AND endTime is recent (within this grace window); an inProgress
// flag stuck true on a session whose last update is far older than that is the
// original stale-flag bug, and correctly counts as finished.
const IN_PROGRESS_GRACE_MS = 45 * 60 * 1000; // 45 minutes — sync interval (30min) + buffer

export function isSessionStillInProgress(session, nowMs = Date.now()) {
  if (!session || !session.inProgress) return false;
  const endMs = parseSessionTimeMs(session.endTime);
  if (endMs !== null && nowMs - endMs > IN_PROGRESS_GRACE_MS) return false;
  return true;
}

// Looks up the most recently ended archived session for this device, used to decide
// whether the next incoming fragment should be merged into it instead of becoming a
// new session doc.
export async function getLatestDeviceSession(deviceId) {
  const snap = await getDocs(
    query(
      collection(firestore, "deviceHistory", deviceId, "history"),
      orderBy("endTimeMs", "desc"),
      limit(1)
    )
  );
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return { id: docSnap.id, data: docSnap.data() };
}

const FRAGMENT_STAT_FIELDS = ["sleepMin", "bedMin", "deepMin", "lightMin", "wakes", "turns", "apnea", "avgHR", "avgBR", "score"];

export function extractFragmentStats(session) {
  const stats = {};
  FRAGMENT_STAT_FIELDS.forEach((f) => { stats[f] = Number(session?.[f]) || 0; });
  return stats;
}

// Combines an existing archived session with a newly-arrived fragment that started
// within SESSION_MERGE_GAP_MS of the existing one ending, producing one continuous
// session record instead of two separate ones.
//
// A still-growing RTDB session can get synced more than once before it's truly
// finished (the firmware's own "is this session done" signals — inProgress and
// endTime — aren't reliable enough to guarantee otherwise; see the merge job).
// To make that safe, every fragment's own stats are kept in `fragmentStats`,
// keyed by its source session ID, and the totals below are always RECOMPUTED
// from that map rather than added onto the previous total — so re-syncing the
// same fragment again just overwrites its one entry and the total stays
// correct, instead of the same minutes getting counted again each time.
export function mergeSessionFragments(existing, incoming) {
  const fragmentStats = { ...(existing?.fragmentStats || {}) };
  if (existing?.sourceSessionId && !fragmentStats[existing.sourceSessionId]) {
    fragmentStats[existing.sourceSessionId] = extractFragmentStats(existing);
  }
  fragmentStats[incoming.sourceSessionId] = extractFragmentStats(incoming);

  const fragments = Object.values(fragmentStats);
  const sumOf = (field) => fragments.reduce((a, f) => a + (f[field] || 0), 0);
  const sleepMin = sumOf("sleepMin");
  const deepMin = sumOf("deepMin");
  const lightMin = sumOf("lightMin");

  const weightedAvg = (field) => {
    if (sleepMin <= 0) return incoming?.[field] ?? existing?.[field] ?? 0;
    const weighted = fragments.reduce((a, f) => a + (f[field] || 0) * (f.sleepMin || 0), 0);
    return Math.round(weighted / sleepMin);
  };

  const existingEndMs = parseSessionTimeMs(existing?.endTime);
  const incomingEndMs = parseSessionTimeMs(incoming?.endTime);
  const laterEndTime =
    existingEndMs !== null && incomingEndMs !== null
      ? (incomingEndMs >= existingEndMs ? incoming?.endTime : existing?.endTime)
      : (incoming?.endTime ?? existing?.endTime);

  return {
    ...existing,
    startTime: existing?.startTime ?? incoming?.startTime,
    endTime: laterEndTime,
    endTimeMs: Math.max(existingEndMs ?? 0, incomingEndMs ?? 0) || null,
    // The incoming fragment is the freshest read straight from RTDB, so trust
    // its own inProgress flag rather than assuming "it got synced, so it must be
    // done" — a still-growing session gets re-synced on purpose (see the merge
    // job) precisely so its stats stay accurate, and hardcoding false here was
    // making every re-sync stomp the true "still active" state back to finished.
    inProgress: Boolean(incoming?.inProgress),
    sleepMin,
    bedMin: sumOf("bedMin"),
    onsetMin: existing?.onsetMin ?? incoming?.onsetMin ?? 0,
    deepMin,
    lightMin,
    deepPct: sleepMin > 0 ? Math.round((deepMin / sleepMin) * 100) : (existing?.deepPct ?? 0),
    lightPct: sleepMin > 0 ? Math.round((lightMin / sleepMin) * 100) : (existing?.lightPct ?? 0),
    wakes: sumOf("wakes"),
    turns: sumOf("turns"),
    apnea: sumOf("apnea"),
    avgHR: weightedAvg("avgHR"),
    avgBR: weightedAvg("avgBR"),
    score: weightedAvg("score"),
    sleepTimeline: { ...(existing?.sleepTimeline || {}), ...(incoming?.sleepTimeline || {}) },
    fragmentStats,
    mergedFragmentIds: Object.keys(fragmentStats),
  };
}

// Radar-based light/deep classification can flip every couple of minutes, which
// doesn't reflect how real sleep cycles work (stages typically last much longer).
// Any Light or Deep segment shorter than minStageDurationMin is folded forward
// into whichever segment preceded it — it just "continues" the previous stage
// instead of standing on its own (e.g. light 12:00-12:10, deep 12:10-12:20 (10min,
// too short) becomes one light stretch 12:00-12:20). Awake segments are always
// kept regardless of duration, and a short segment with nothing before it (the
// very first segment) is also kept as-is, since there's nothing to fold into.
// Returns a new sparse { timeStr: stage } timeline (one entry per transition)
// plus duration-based minute/percent totals per stage.
export function smoothSleepTimeline(sleepTimeline, startTime, endTime, minStageDurationMin = 15, markEndAwake = false) {
  const entries = Object.entries(sleepTimeline || {}).sort((a, b) => a[0].localeCompare(b[0]));
  const startMs = parseSessionTimeMs(startTime);
  const endMs = parseSessionTimeMs(endTime);

  if (entries.length === 0 || startMs === null || endMs === null || endMs <= startMs) {
    return { timeline: sleepTimeline || {}, minutesByStage: {} };
  }

  // Raw segments straight from the sparse entries (each runs until the next entry,
  // or endTime for the last one), collapsing any accidental consecutive repeats.
  const segs = [];
  entries.forEach(([t, stage], i) => {
    const segStartMs = Math.max(startMs, timeOfDayToMs(t, startMs) ?? startMs);
    const nextMs = i + 1 < entries.length ? (timeOfDayToMs(entries[i + 1][0], startMs) ?? endMs) : endMs;
    const segEndMs = Math.max(segStartMs, nextMs);
    if (segs.length && segs[segs.length - 1].stage === stage) {
      segs[segs.length - 1].endMs = segEndMs;
    } else {
      segs.push({ stage, startMs: segStartMs, endMs: segEndMs });
    }
  });

  // Fold short Light/Deep segments into whatever precedes them, cascading in one
  // left-to-right pass (a fold can make the new "previous" segment long enough
  // that the next short segment folds into it too, or can newly match stages
  // with what follows — a second adjacent-merge pass below catches that case).
  const folded = [];
  for (const seg of segs) {
    const durMin = (seg.endMs - seg.startMs) / 60000;
    const isFoldable = (seg.stage === "Light" || seg.stage === "Deep") && durMin < minStageDurationMin;
    if (isFoldable && folded.length > 0) {
      folded[folded.length - 1].endMs = seg.endMs;
    } else {
      folded.push({ ...seg });
    }
  }

  const merged = [];
  for (const seg of folded) {
    if (merged.length && merged[merged.length - 1].stage === seg.stage) {
      merged[merged.length - 1].endMs = seg.endMs;
    } else {
      merged.push({ ...seg });
    }
  }

  const minutesByStage = {};
  const timeline = {};
  const fmtTime = (ms) => {
    const d = new Date(ms);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  merged.forEach((seg) => {
    const dur = Math.round((seg.endMs - seg.startMs) / 60000);
    minutesByStage[seg.stage] = (minutesByStage[seg.stage] || 0) + dur;
    timeline[fmtTime(seg.startMs)] = seg.stage;
  });

  // A completed session ends with waking up — if the last stage isn't already
  // Awake, add a zero-duration Awake marker right at the end so the chart shows
  // it, without taking any minutes away from whatever stage came before it.
  if (markEndAwake && merged.length && merged[merged.length - 1].stage !== "Awake") {
    timeline[fmtTime(endMs)] = "Awake";
  }

  const total = Object.values(minutesByStage).reduce((a, b) => a + b, 0) || 1;
  const pctByStage = {};
  Object.entries(minutesByStage).forEach(([stage, min]) => {
    pctByStage[stage] = Math.round((min / total) * 100);
  });

  return {
    timeline,
    minutesByStage,
    pctByStage,
    deepMin: minutesByStage.Deep || 0,
    lightMin: minutesByStage.Light || 0,
    deepPct: pctByStage.Deep || 0,
    lightPct: pctByStage.Light || 0,
  };
}

// Writes targetSessionId's Firestore doc, either as a brand-new session or merged
// on top of an existing session's data.
export async function writeMergedSession(deviceId, targetSessionId, mergedData) {
  await setDoc(
    sessionDocRef(deviceId, targetSessionId),
    { ...mergedData, mirroredAt: serverTimestamp() },
    { merge: true }
  );
}

export async function getDeviceSession(deviceId, sessionId) {
  const snap = await getDoc(sessionDocRef(deviceId, sessionId));
  return snap.exists() ? snap.data() : null;
}

export async function removeMirroredSession(deviceId, sessionId) {
  await deleteDoc(sessionDocRef(deviceId, sessionId));
}

// Subscribes to every archived session for this device. Calls onChange with
// a { [sessionId]: sessionData } map.
export function subscribeDeviceHistory(deviceId, onChange, onError) {
  return onSnapshot(
    collection(firestore, "deviceHistory", deviceId, "history"),
    (snap) => {
      const map = {};
      snap.forEach((d) => {
        map[d.id] = d.data();
      });
      onChange(map);
    },
    onError
  );
}
