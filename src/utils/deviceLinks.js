import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { firestore } from "../firebase.js";
import { normalizeMacNoColons } from "./mac.js";

// Devices are linked per-user under users/{email}/devices/{deviceId}.
// deviceId is the device's MAC address (no colons, uppercase — normalized here so
// it doesn't matter whether the caller passed a raw scanned/typed MAC); the same
// MAC can be linked under multiple different users' accounts (e.g. a shared
// physical monitor). The MAC is never shown in the UI — each linked device gets a
// friendly `label` (e.g. "Acme 01") assigned once at link time, which the user can
// override with their own `displayName`.
function deviceDocRef(email, deviceId) {
  return doc(firestore, "users", email, "devices", normalizeMacNoColons(deviceId));
}

function devicesCollectionRef(email) {
  return collection(firestore, "users", email, "devices");
}

// Subscribes to the set of device IDs linked to `email`. Calls onChange with a string[].
export function subscribeUserDeviceIds(email, onChange, onError) {
  return onSnapshot(
    devicesCollectionRef(email),
    (snap) => onChange(snap.docs.map((d) => d.id)),
    onError
  );
}

// Subscribes to full device records ({ id, label, displayName, room, ... }) linked to `email`.
export function subscribeUserDevices(email, onChange, onError) {
  return onSnapshot(
    devicesCollectionRef(email),
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
}

export async function getUserDeviceRecord(email, deviceId) {
  const snap = await getDoc(deviceDocRef(email, deviceId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function linkDeviceToUser(email, deviceId) {
  const normalizedId = normalizeMacNoColons(deviceId);
  const linkRef = deviceDocRef(email, normalizedId);
  const existing = await getDoc(linkRef);
  if (existing.exists()) {
    throw new Error("This device is already linked to your account.");
  }

  const [existingDevicesSnap, profileSnap] = await Promise.all([
    getDocs(devicesCollectionRef(email)),
    getDoc(doc(firestore, "users", email)),
  ]);

  const company = (profileSnap.exists() && profileSnap.data().company || "").trim();
  const prefix = company || "Monitor";
  const nextIndex = existingDevicesSnap.size + 1;
  const label = `${prefix} ${String(nextIndex).padStart(2, "0")}`;

  await setDoc(linkRef, {
    macAddress: normalizedId,
    label,
    displayName: null,
    room: null,
    linkedAt: serverTimestamp(),
  });
}

// Devices linked before the labeling feature existed have no `label` field, which
// made them fall back to a bare "Monitor" with no number. Backfills a proper
// "{Company} 0N" label for any such device, continuing the sequence after
// whatever devices already have one.
export async function ensureDeviceLabels(email) {
  const [devicesSnap, profileSnap] = await Promise.all([
    getDocs(devicesCollectionRef(email)),
    getDoc(doc(firestore, "users", email)),
  ]);

  const missing = devicesSnap.docs.filter((d) => !d.data().label);
  if (missing.length === 0) return;

  const company = (profileSnap.exists() && profileSnap.data().company || "").trim();
  const prefix = company || "Monitor";
  const alreadyLabeled = devicesSnap.size - missing.length;

  const sortedMissing = missing.slice().sort((a, b) => {
    const at = a.data().linkedAt?.toMillis?.() ?? 0;
    const bt = b.data().linkedAt?.toMillis?.() ?? 0;
    return at - bt;
  });

  await Promise.all(
    sortedMissing.map((d, i) => {
      const label = `${prefix} ${String(alreadyLabeled + i + 1).padStart(2, "0")}`;
      return setDoc(d.ref, { label }, { merge: true });
    })
  );
}

export async function updateDeviceDetails(email, deviceId, { displayName, room }) {
  await setDoc(
    deviceDocRef(email, deviceId),
    {
      displayName: displayName?.trim() || null,
      room: room?.trim() || null,
    },
    { merge: true }
  );
}

export async function unlinkDeviceFromUser(email, deviceId) {
  await deleteDoc(deviceDocRef(email, deviceId));
}
