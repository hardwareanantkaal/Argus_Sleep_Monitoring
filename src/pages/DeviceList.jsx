import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { db } from "../firebase.js";
import { ref, onValue } from "firebase/database";

// A device is considered "online" if its /info/lastSeen heartbeat (unix
// seconds, sent by the ESP32 every FIREBASE_INFO_MS) is recent. The firmware
// pushes /info roughly every 30s, so 90s of silence means it's likely offline.
const ONLINE_THRESHOLD_SEC = 90;

export default function DeviceList() {
  const [devices, setDevices] = useState(null); // null = loading, {} = loaded (maybe empty)

  useEffect(() => {
    const devicesRef = ref(db, "devices");
    const unsub = onValue(
      devicesRef,
      (snapshot) => setDevices(snapshot.val() || {}),
      (err) => {
        console.error("Failed to read /devices:", err);
        setDevices({});
      }
    );
    return () => unsub();
  }, []);

  return (
    <div className="page">
      <header className="page-header">
        <h1>Argus Sleep Monitoring</h1>
        <p className="subtitle">Select a device to view its live data</p>
      </header>

      {devices === null && <p className="muted">Loading devices…</p>}

      {devices !== null && Object.keys(devices).length === 0 && (
        <p className="muted">
          No devices found yet. Once an Argus unit connects to WiFi and pushes
          data, it will appear here automatically.
        </p>
      )}

      <div className="device-grid">
        {devices &&
          Object.entries(devices).map(([id, d]) => {
            const info = d.info || {};
            const live = d.live || {};
            const nowSec = Math.floor(Date.now() / 1000);
            const online =
              typeof info.lastSeen === "number" &&
              nowSec - info.lastSeen < ONLINE_THRESHOLD_SEC;

            return (
              <Link to={`/device/${id}`} key={id} className="device-card">
                <div className="device-card-top">
                  <span className={`status-dot ${online ? "online" : "offline"}`} />
                  <span className="device-name">{info.deviceName || "Argus Sleep Monitoring"}</span>
                </div>
                <div className="device-id">{id}</div>
                <div className="device-stats">
                  <span>{online ? "Online" : "Offline"}</span>
                  {live.presence !== undefined && (
                    <span>{live.presence ? "Presence detected" : "No presence"}</span>
                  )}
                </div>
              </Link>
            );
          })}
      </div>
    </div>
  );
}
