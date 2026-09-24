import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase.js";

// Returns null while loading, otherwise the array of every device ID present
// under devices/ in Realtime Database — there is no per-user ownership or
// linking step, every visitor sees every device.
export function useAllDeviceIds() {
  const [ids, setIds] = useState(null);

  useEffect(() => {
    const devicesRef = ref(db, "devices");
    const unsub = onValue(
      devicesRef,
      (snap) => {
        const val = snap.val();
        setIds(val ? Object.keys(val) : []);
      },
      (err) => {
        console.error("Failed to load device list:", err);
        setIds([]);
      }
    );
    return unsub;
  }, []);

  return ids;
}
