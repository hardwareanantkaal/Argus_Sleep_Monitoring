const KEY = "argus_last_device_id";

export function getLastDeviceId() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setLastDeviceId(id) {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // ignore storage errors (private browsing, etc.)
  }
}
