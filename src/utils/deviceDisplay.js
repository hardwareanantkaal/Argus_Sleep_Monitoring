// The device's MAC address (its RTDB/Firestore key) is never shown in the UI.
// Every card/header shows this instead: the user's own name for it, or the
// auto-assigned default ("Acme 01") from when they linked it.
export function getDeviceDisplayName(record) {
  if (!record) return "Monitor";
  return record.displayName?.trim() || record.label || "Monitor";
}
