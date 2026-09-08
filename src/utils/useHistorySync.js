import { useEffect } from "react";
import { runHistorySyncSweep, HISTORY_SYNC_INTERVAL_MS } from "./historySyncJob.js";

// Runs the history transfer sweep once on mount (catch-up for whatever accumulated
// while no one had the app open) and then every 30 minutes while the app stays open.
export function useHistorySync(email, deviceIds) {
  const deviceIdsKey = (deviceIds || []).join(",");

  useEffect(() => {
    if (!email || !deviceIdsKey) return;
    const ids = deviceIdsKey.split(",");

    let cancelled = false;
    const sweep = () => {
      if (!cancelled) runHistorySyncSweep(email, ids);
    };

    sweep();
    const timer = setInterval(sweep, HISTORY_SYNC_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [email, deviceIdsKey]);
}
