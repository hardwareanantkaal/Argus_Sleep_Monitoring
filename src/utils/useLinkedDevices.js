import { useEffect, useState } from "react";
import { subscribeUserDevices } from "./deviceLinks.js";

// Returns null while loading, otherwise the array of { id, label, displayName, room, ... }
// records linked to `email`.
export function useLinkedDevices(email) {
  const [devices, setDevices] = useState(null);

  useEffect(() => {
    if (!email) {
      setDevices([]);
      return;
    }
    setDevices(null);
    const unsub = subscribeUserDevices(
      email,
      (next) => setDevices(next),
      (err) => {
        console.error("Failed to load linked devices:", err);
        setDevices([]);
      }
    );
    return unsub;
  }, [email]);

  return devices;
}
