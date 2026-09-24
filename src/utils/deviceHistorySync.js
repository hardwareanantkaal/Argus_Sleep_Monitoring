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
