import { ref, get, remove } from "firebase/database";
import { db } from "../firebase.js";
import { evaluateDeviceStatus } from "./status.js";
import {
  SESSION_MERGE_GAP_MS,
  parseSessionTimeMs,
  isSessionStillInProgress,
  getLatestDeviceSession,
  mergeSessionFragments,
  writeMergedSession,
} from "./deviceHistorySync.js";

export const HISTORY_SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

// Moves completed sleep sessions out of Realtime Database and into the public
// Firestore history (deviceHistory/{deviceId}/history/{sessionId}):
//   - device online  -> only sessions that have finished (tonight's in-progress
//                       session is left alone, since the firmware is still writing it)
//   - device offline -> everything currently in history/, since the firmware
//                       won't be finishing an in-progress session by itself
// A session with no history data at all is left untouched either way.
//
// Fragments that start within SESSION_MERGE_GAP_MS of the previous archived
// session's end (e.g. the device briefly dropped WiFi and started a new RTDB
// session node on reconnect) are folded into that same Firestore session doc
// instead of becoming a separate session, so one night stays one record.
async function syncDeviceHistory(deviceId) {
  const [infoSnap, liveSnap, historySnap] = await Promise.all([
    get(ref(db, `devices/${deviceId}/info`)),
    get(ref(db, `devices/${deviceId}/live`)),
    get(ref(db, `devices/${deviceId}/history`)),
  ]);

  const history = historySnap.val();
  if (!history) return;

  const { online } = evaluateDeviceStatus({ info: infoSnap.val(), live: liveSnap.val() });
  const nowMs = Date.now();

  const pending = Object.entries(history)
    .filter(([, session]) => session && !(online && isSessionStillInProgress(session, nowMs)))
    .sort((a, b) => {
      const aMs = parseSessionTimeMs(a[1]?.startTime) ?? 0;
      const bMs = parseSessionTimeMs(b[1]?.startTime) ?? 0;
      return aMs - bMs;
    });

  if (pending.length === 0) return;

  let mergeTarget = await getLatestDeviceSession(deviceId);

  for (const [sessionId, session] of pending) {
    try {
      const startMs = parseSessionTimeMs(session.startTime);
      const targetEndMs = mergeTarget?.data?.endTimeMs ?? null;

      const canMerge =
        mergeTarget &&
        startMs !== null &&
        targetEndMs !== null &&
        startMs - targetEndMs <= SESSION_MERGE_GAP_MS;

      if (canMerge) {
        const merged = mergeSessionFragments(mergeTarget.data, {
          ...session,
          sourceSessionId: sessionId,
        });
        await writeMergedSession(deviceId, mergeTarget.id, merged);
        mergeTarget = { id: mergeTarget.id, data: merged };
      } else {
        const endMs = parseSessionTimeMs(session.endTime);
        const newSessionData = {
          ...session,
          startTimeMs: startMs,
          endTimeMs: endMs,
          sourceSessionId: sessionId,
        };
        await writeMergedSession(deviceId, sessionId, newSessionData);
        mergeTarget = { id: sessionId, data: newSessionData };
      }

      await remove(ref(db, `devices/${deviceId}/history/${sessionId}`));
    } catch (err) {
      console.error(`History sync failed for ${deviceId}/${sessionId}:`, err);
    }
  }
}

export async function runHistorySyncSweep(deviceIds) {
  for (const deviceId of deviceIds) {
    try {
      await syncDeviceHistory(deviceId);
    } catch (err) {
      console.error(`History sync failed for device ${deviceId}:`, err);
    }
  }
}
