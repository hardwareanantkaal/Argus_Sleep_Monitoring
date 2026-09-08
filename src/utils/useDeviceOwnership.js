import { useEffect, useState } from "react";
import { getUserDeviceRecord } from "./deviceLinks.js";
import { claimAndLinkDevice } from "./manufacturedDevices.js";
import { normalizeMacNoColons } from "./mac.js";

// Checks whether `email` has linked `rawDeviceId`, and exposes a way to link it
// on the spot (e.g. when someone opens a raw /device/:id link they haven't added yet).
// rawDeviceId is normalized here (no colons, uppercase) so it doesn't matter whether
// it came from a typed MAC, a scanned QR code, or a bookmarked URL — the returned
// `deviceId` is what every caller should use for further RTDB/Firestore lookups.
export function useDeviceOwnership(email, rawDeviceId) {
  const deviceId = normalizeMacNoColons(rawDeviceId);
  const [ownershipChecked, setOwnershipChecked] = useState(false);
  const [deviceRecord, setDeviceRecord] = useState(null);
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setOwnershipChecked(false);
    getUserDeviceRecord(email, deviceId)
      .then((record) => {
        if (!cancelled) {
          setDeviceRecord(record);
          setOwnershipChecked(true);
        }
      })
      .catch((err) => {
        console.error("Failed to check device ownership:", err);
        if (!cancelled) {
          setDeviceRecord(null);
          setOwnershipChecked(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [email, deviceId]);

  const linkThisDevice = async () => {
    setLinkError("");
    setLinking(true);
    try {
      await claimAndLinkDevice(email, deviceId);
      const record = await getUserDeviceRecord(email, deviceId);
      setDeviceRecord(record);
    } catch (err) {
      setLinkError(err.message || "Failed to link device.");
    } finally {
      setLinking(false);
    }
  };

  return { ownershipChecked, isOwned: deviceRecord !== null, deviceRecord, deviceId, linking, linkError, linkThisDevice };
}
