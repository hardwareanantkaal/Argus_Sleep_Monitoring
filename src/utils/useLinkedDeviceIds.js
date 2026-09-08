import { useEffect, useState } from "react";
import { subscribeUserDeviceIds } from "./deviceLinks.js";

// Returns null while loading, otherwise the array of device IDs linked to `email`.
export function useLinkedDeviceIds(email) {
  const [ids, setIds] = useState(null);

  useEffect(() => {
    if (!email) {
      setIds([]);
      return;
    }
    setIds(null);
    const unsub = subscribeUserDeviceIds(
      email,
      (nextIds) => setIds(nextIds),
      (err) => {
        console.error("Failed to load linked devices:", err);
        setIds([]);
      }
    );
    return unsub;
  }, [email]);

  return ids;
}
