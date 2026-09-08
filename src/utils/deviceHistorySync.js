import { doc, collection, setDoc, deleteDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { firestore } from "../firebase.js";

// Archived sleep sessions live in this user's Firestore copy at
// users/{email}/devices/{deviceId}/history/{sessionId} — the destination of the
// "cut" performed by the 30-minute history sync job (see historySyncJob.js).
function sessionDocRef(email, deviceId, sessionId) {
  return doc(firestore, "users", email, "devices", deviceId, "history", sessionId);
}

export async function mirrorSessionToUserHistory(email, deviceId, sessionId, sessionData) {
  await setDoc(
    sessionDocRef(email, deviceId, sessionId),
    { ...sessionData, mirroredAt: serverTimestamp() },
    { merge: true }
  );
}

export async function removeMirroredSession(email, deviceId, sessionId) {
  await deleteDoc(sessionDocRef(email, deviceId, sessionId));
}

// Subscribes to every archived session for this device. Calls onChange with
// a { [sessionId]: sessionData } map.
export function subscribeUserDeviceHistory(email, deviceId, onChange, onError) {
  return onSnapshot(
    collection(firestore, "users", email, "devices", deviceId, "history"),
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
