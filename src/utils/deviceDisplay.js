// There is no account/link step anymore, so a device's RTDB key (its MAC,
// no colons) is the only identifier available — show it directly.
export function getDeviceDisplayName(deviceId) {
  return deviceId ? `Argus ${deviceId}` : "Monitor";
}
