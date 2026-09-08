import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase.js";
import { evaluateDeviceStatus, useTick } from "./status.js";

// Subscribes to Realtime Database data for every device in `linkedIds` and
// returns each one's { id, info, live, status, found }. Shared by any page that
// needs to show more than one device at a time (Home, the Live/History switchers).
export function useDevicesData(linkedIds) {
  const [devices, setDevices] = useState({});
  const [lastReceivedMap, setLastReceivedMap] = useState({});
  const nowMs = useTick(1000);

  useEffect(() => {
    if (!linkedIds) return;
    const childListeners = new Map();

    linkedIds.forEach((id) => {
      let isInitial = true;
      const singleDeviceRef = ref(db, `devices/${id}`);
      const unsubDevice = onValue(
        singleDeviceRef,
        (deviceSnap) => {
          setDevices((prev) => ({ ...prev, [id]: deviceSnap.val() }));
          if (!isInitial) {
            setLastReceivedMap((prev) => ({ ...prev, [id]: Date.now() }));
          } else {
            isInitial = false;
          }
        },
        (err) => {
          console.error(`Failed to read /devices/${id}:`, err);
        }
      );
      childListeners.set(id, unsubDevice);
    });

    setDevices((prev) => {
      const next = {};
      linkedIds.forEach((id) => {
        if (prev[id] !== undefined) next[id] = prev[id];
      });
      return next;
    });

    return () => {
      for (const unsubFn of childListeners.values()) unsubFn();
    };
  }, [linkedIds]);

  if (!linkedIds) return [];

  return linkedIds.map((id) => {
    const d = devices[id];
    const info = d?.info || {};
    const live = d?.live || {};
    const status = evaluateDeviceStatus({
      info,
      live,
      lastReceivedAt: lastReceivedMap[id],
      nowMs,
    });

    return { id, info, live, status, found: d !== undefined && d !== null };
  });
}
