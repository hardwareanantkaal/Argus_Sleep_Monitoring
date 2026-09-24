// Normalizes any MAC representation (colon-separated, dash-separated, lowercase,
// typed by hand) into the no-colon uppercase form used as the RTDB/Firestore key
// (devices/{macNoColons}) so a MAC always resolves to the same device regardless
// of how it was entered.
export function normalizeMacNoColons(mac) {
  return (mac || "").replace(/[^a-fA-F0-9]/g, "").toUpperCase();
}
