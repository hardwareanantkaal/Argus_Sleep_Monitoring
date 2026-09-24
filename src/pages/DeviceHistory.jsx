import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase.js";
import { ref, onValue } from "firebase/database";

import ArgusHeader from "../components/ArgusHeader.jsx";
import HistorySection from "../components/HistorySection.jsx";
import { evaluateDeviceStatus, useTick } from "../utils/status.js";
import { getDeviceDisplayName } from "../utils/deviceDisplay.js";
import { subscribeDeviceHistory } from "../utils/deviceHistorySync.js";
import { setLastDeviceId } from "../utils/lastDevice.js";
import { normalizeMacNoColons } from "../utils/mac.js";

export default function DeviceHistory() {
  const { deviceId: rawDeviceId } = useParams();
  const deviceId = normalizeMacNoColons(rawDeviceId);
  const [info, setInfo] = useState(null);
  const [live, setLive] = useState(null);
  const [liveHistory, setLiveHistory] = useState(null);
  const [archivedHistory, setArchivedHistory] = useState(null);
  const [lastReceivedAt, setLastReceivedAt] = useState(null);

  const nowMs = useTick(1000);

  // Remember this as the last-viewed device, for the sidebar's Live Stream / History shortcuts
  useEffect(() => {
    setLastDeviceId(deviceId);
  }, [deviceId]);

  useEffect(() => {
    const infoRef = ref(db, `devices/${deviceId}/info`);
    const liveRef = ref(db, `devices/${deviceId}/live`);
    const historyRef = ref(db, `devices/${deviceId}/history`);

    let isInitialLive = true;

    const unsubInfo = onValue(infoRef, (snap) => setInfo(snap.val()));

    const unsubLive = onValue(liveRef, (snap) => {
      setLive(snap.val());
      if (!isInitialLive) {
        setLastReceivedAt(Date.now());
      } else {
        isInitialLive = false;
      }
    });

    const unsubHistory = onValue(historyRef, (snap) => setLiveHistory(snap.val()));

    return () => {
      unsubInfo();
      unsubLive();
      unsubHistory();
    };
  }, [deviceId]);

  // Sessions the 30-minute sync job has already moved out of Realtime Database
  // (see historySyncJob.js) — still shown here, just from their new home.
  useEffect(() => {
    const unsub = subscribeDeviceHistory(
      deviceId,
      setArchivedHistory,
      (err) => {
        console.error("Failed to load archived history:", err);
        setArchivedHistory({});
      }
    );
    return unsub;
  }, [deviceId]);

  // A session is either still in Realtime Database (recent / not yet swept) or
  // already archived to Firestore — merge both so nothing disappears from view.
  const history = useMemo(() => {
    if (!liveHistory && !archivedHistory) return null;
    return { ...(archivedHistory || {}), ...(liveHistory || {}) };
  }, [liveHistory, archivedHistory]);

  const status = evaluateDeviceStatus({
    info,
    live,
    lastReceivedAt,
    nowMs,
  });

  return (
    <div className="page argus-page">
      <ArgusHeader
        deviceName={getDeviceDisplayName(deviceId)}
        online={status.online}
        lastSeenText={status.lastSeenText}
        rssi={info?.rssi}
        showBack={true}
      />

      <HistorySection deviceId={deviceId} history={history} />
    </div>
  );
}
