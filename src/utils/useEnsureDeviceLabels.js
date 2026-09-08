import { useEffect } from "react";
import { ensureDeviceLabels } from "./deviceLinks.js";

// Runs once per session to backfill labels on any device linked before the
// labeling feature existed (see ensureDeviceLabels in deviceLinks.js).
export function useEnsureDeviceLabels(email) {
  useEffect(() => {
    if (!email) return;
    ensureDeviceLabels(email).catch((err) => {
      console.error("Failed to backfill device labels:", err);
    });
  }, [email]);
}
