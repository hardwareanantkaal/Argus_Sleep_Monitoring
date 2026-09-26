import { ref, get, remove } from "firebase/database";
import { db } from "../firebase.js";
import {
  SESSION_MERGE_GAP_MS,
  parseSessionTimeMs,
  getLatestDeviceSession,
  mergeSessionFragments,
  writeMergedSession,
  extractFragmentStats,
} from "./deviceHistorySync.js";

export const HISTORY_SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

// Moves sleep sessions out of Realtime Database and into the public Firestore
// history (deviceHistory/{deviceId}/history/{sessionId}) — every sweep, every
// session currently in RTDB, whether it's still being actively written or not.
// This used to skip a session still in progress (leaving it for firmware to
// finish writing), but merging is now idempotent per source fragment (see
// mergeSessionFragments) — re-syncing the same still-growing session on every
// sweep is safe and is in fact what keeps its Firestore mirror (and the
// inProgress/endTime the UI reads for the LIVE badge) from going stale while
// it's genuinely still ongoing.
//
// Fragments that start within SESSION_MERGE_GAP_MS of the previous archived
// session's end (e.g. the device briefly dropped WiFi and started a new RTDB
// session node on reconnect) are folded into that same Firestore session doc
// instead of becoming a separate session, so one night stays one record.
async function syncDeviceHistory(deviceId) {
  const historySnap = await get(ref(db, `devices/${deviceId}/history`));
  const history = historySnap.val();
  if (!history) return;

  const pending = Object.entries(history)
    .filter(([, session]) => Boolean(session))
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
          fragmentStats: { [sessionId]: extractFragmentStats(session) },
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
