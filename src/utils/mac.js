// Normalizes any MAC representation (colon-separated, dash-separated, lowercase,
// scanned straight off a QR code, typed by hand) into the no-colon uppercase form
// used as the Firestore doc ID under users/{email}/devices/{macNoColons} — the same
// convention the Argus manufacturing app's normalizeMacNoColons() uses when writing
// manufacturedDevices records, so a scanned/typed MAC always resolves to the same device.
export function normalizeMacNoColons(mac) {
  return (mac || "").replace(/[^a-fA-F0-9]/g, "").toUpperCase();
}
