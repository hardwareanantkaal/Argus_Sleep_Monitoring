import { ref, get, remove } from "firebase/database";
import { db } from "../firebase.js";
import { evaluateDeviceStatus } from "./status.js";
import { mirrorSessionToUserHistory } from "./deviceHistorySync.js";

export const HISTORY_SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

// Moves completed sleep sessions out of Realtime Database and into this user's
// Firestore history (users/{email}/devices/{deviceId}/history/{sessionId}):
//   - device online  -> only sessions that have finished (tonight's in-progress
//                       session is left alone, since the firmware is still writing it)
//   - device offline -> everything currently in history/, since the firmware
//                       won't be finishing an in-progress session by itself
// A session with no history data at all is left untouched either way.
async function syncDeviceHistory(email, deviceId) {
  const [infoSnap, liveSnap, historySnap] = await Promise.all([
    get(ref(db, `devices/${deviceId}/info`)),
    get(ref(db, `devices/${deviceId}/live`)),
    get(ref(db, `devices/${deviceId}/history`)),
  ]);

  const history = historySnap.val();
  if (!history) return;

  const { online } = evaluateDeviceStatus({ info: infoSnap.val(), live: liveSnap.val() });

  for (const [sessionId, session] of Object.entries(history)) {
    if (!session) continue;
    if (online && session.inProgress) continue;

    try {
      await mirrorSessionToUserHistory(email, deviceId, sessionId, session);
      await remove(ref(db, `devices/${deviceId}/history/${sessionId}`));
    } catch (err) {
      console.error(`History sync failed for ${deviceId}/${sessionId}:`, err);
    }
  }
}

export async function runHistorySyncSweep(email, deviceIds) {
  for (const deviceId of deviceIds) {
    try {
      await syncDeviceHistory(email, deviceId);
    } catch (err) {
      console.error(`History sync failed for device ${deviceId}:`, err);
    }
  }
}
