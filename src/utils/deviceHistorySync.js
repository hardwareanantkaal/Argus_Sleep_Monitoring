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
// can never age out. A session only counts as still in progress if the flag is
// set AND its endTime hasn't already passed.
export function isSessionStillInProgress(session, nowMs = Date.now()) {
  if (!session || !session.inProgress) return false;
  const endMs = parseSessionTimeMs(session.endTime);
  if (endMs !== null && endMs < nowMs) return false;
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

function sumField(a, b, field) {
  return (Number(a?.[field]) || 0) + (Number(b?.[field]) || 0);
}

// Combines an existing archived session with a newly-arrived fragment that started
// within SESSION_MERGE_GAP_MS of the existing one ending, producing one continuous
// session record instead of two separate ones.
export function mergeSessionFragments(existing, incoming) {
  const sleepMin = sumField(existing, incoming, "sleepMin");
  const deepMin = sumField(existing, incoming, "deepMin");
  const lightMin = sumField(existing, incoming, "lightMin");
  const existingSleepMin = Number(existing?.sleepMin) || 0;
  const incomingSleepMin = Number(incoming?.sleepMin) || 0;

  const weightedAvg = (field) => {
    if (sleepMin <= 0) return incoming?.[field] ?? existing?.[field] ?? 0;
    const existingVal = Number(existing?.[field]) || 0;
    const incomingVal = Number(incoming?.[field]) || 0;
    return Math.round(
      (existingVal * existingSleepMin + incomingVal * incomingSleepMin) / sleepMin
    );
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
    inProgress: false,
    sleepMin,
    bedMin: sumField(existing, incoming, "bedMin"),
    onsetMin: existing?.onsetMin ?? incoming?.onsetMin ?? 0,
    deepMin,
    lightMin,
    deepPct: sleepMin > 0 ? Math.round((deepMin / sleepMin) * 100) : (existing?.deepPct ?? 0),
    lightPct: sleepMin > 0 ? Math.round((lightMin / sleepMin) * 100) : (existing?.lightPct ?? 0),
    wakes: sumField(existing, incoming, "wakes"),
    turns: sumField(existing, incoming, "turns"),
    apnea: sumField(existing, incoming, "apnea"),
    avgHR: weightedAvg("avgHR"),
    avgBR: weightedAvg("avgBR"),
    score: weightedAvg("score"),
    sleepTimeline: { ...(existing?.sleepTimeline || {}), ...(incoming?.sleepTimeline || {}) },
    mergedFragmentIds: [
      ...(existing?.mergedFragmentIds || [existing?.sourceSessionId].filter(Boolean)),
      incoming?.sourceSessionId,
    ].filter(Boolean),
  };
}

// Radar-based light/deep classification can flip every couple of minutes, which
// doesn't reflect how real sleep cycles work (stages typically last tens of
// minutes). This applies a sliding-window majority vote (mode filter) over the
// per-minute stage sequence, collapsing noisy flip-flopping into a handful of
// real stretches while staying close to the original totals (unlike a hard
// minimum-duration cutoff, which can inflate or erase a stage depending on
// what happens to be next to it — see the merge-gap discussion in history).
// Returns a new sparse { timeStr: stage } timeline (one entry per transition)
// plus duration-based minute/percent totals per stage.
export function smoothSleepTimeline(sleepTimeline, startTime, endTime, windowMin = 20) {
  const entries = Object.entries(sleepTimeline || {}).sort((a, b) => a[0].localeCompare(b[0]));
  const startMs = parseSessionTimeMs(startTime);
  const endMs = parseSessionTimeMs(endTime);

  if (entries.length === 0 || startMs === null || endMs === null || endMs <= startMs) {
    return { timeline: sleepTimeline || {}, minutesByStage: {} };
  }

  const totalMin = Math.round((endMs - startMs) / 60000);
  const perMinute = new Array(totalMin).fill(entries[0][1]);
  let idx = 0;
  for (let m = 0; m < totalMin; m++) {
    const mMs = startMs + m * 60000;
    while (idx + 1 < entries.length && (timeOfDayToMs(entries[idx + 1][0], startMs) ?? startMs) <= mMs) idx++;
    perMinute[m] = entries[idx][1];
  }

  const half = Math.floor(windowMin / 2);
  const smoothedPerMinute = perMinute.map((_, i) => {
    const lo = Math.max(0, i - half);
    const hi = Math.min(perMinute.length, i + half + 1);
    const votes = {};
    for (let j = lo; j < hi; j++) votes[perMinute[j]] = (votes[perMinute[j]] || 0) + 1;
    return Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0];
  });

  const minutesByStage = {};
  const timeline = {};
  let segStart = 0;
  const fmtTime = (ms) => {
    const d = new Date(ms);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  for (let i = 0; i <= smoothedPerMinute.length; i++) {
    if (i === smoothedPerMinute.length || smoothedPerMinute[i] !== smoothedPerMinute[segStart]) {
      const stage = smoothedPerMinute[segStart];
      const dur = i - segStart;
      minutesByStage[stage] = (minutesByStage[stage] || 0) + dur;
      timeline[fmtTime(startMs + segStart * 60000)] = stage;
      segStart = i;
    }
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
