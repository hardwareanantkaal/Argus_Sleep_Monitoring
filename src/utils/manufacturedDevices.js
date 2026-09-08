import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { firestore } from "../firebase.js";
import { normalizeMacNoColons } from "./mac.js";
import { linkDeviceToUser } from "./deviceLinks.js";

// manufacturedDevices/{macNoColons} is written by the separate Argus manufacturing
// app when a unit is flashed (chip, firmware, who flashed it, etc.) with
// claimed: false. It's the authoritative record of which MACs are real Argus
// devices — Realtime Database's devices/{id} only exists once the physical unit
// has actually connected to WiFi, which may not have happened yet for a device
// someone is registering fresh out of the box.
function manufacturedDeviceRef(deviceId) {
  return doc(firestore, "manufacturedDevices", normalizeMacNoColons(deviceId));
}

export async function getManufacturedDevice(deviceId) {
  const snap = await getDoc(manufacturedDeviceRef(deviceId));
  return snap.exists() ? snap.data() : null;
}

// Validates the device is a real manufactured unit and not already claimed, then
// atomically flips claimed false -> true (the Firestore security rule enforces
// that transition server-side, so two people claiming the same device at once
// can't both succeed) before linking it to `email`. Rolls the claim back if the
// link step fails, so a device can't get stuck "claimed" with no actual owner.
export async function claimAndLinkDevice(email, deviceId) {
  const normalizedId = normalizeMacNoColons(deviceId);
  const record = await getManufacturedDevice(normalizedId);

  if (!record) {
    throw new Error("This device isn't recognized. Check the ID or QR code and try again.");
  }
  if (record.claimed) {
    throw new Error("This device has already been registered to an account.");
  }

  try {
    await updateDoc(manufacturedDeviceRef(normalizedId), {
      claimed: true,
      claimedByEmail: email,
      claimedAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("Failed to claim device:", err);
    throw new Error("This device has already been registered to an account.");
  }

  try {
    await linkDeviceToUser(email, normalizedId);
  } catch (err) {
    await updateDoc(manufacturedDeviceRef(normalizedId), {
      claimed: false,
      claimedByEmail: null,
      claimedAt: null,
    }).catch(() => {});
    throw err;
  }

  return normalizedId;
}
