import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase.js";
import { ref, onValue, set } from "firebase/database";

import ArgusHeader from "../components/ArgusHeader.jsx";
import LiveDataSection from "../components/LiveDataSection.jsx";
import CompositeSection from "../components/CompositeSection.jsx";
import NightlySection from "../components/NightlySection.jsx";
import HistorySection from "../components/HistorySection.jsx";
import DeviceSettingsPanel from "../components/DeviceSettingsPanel.jsx";
import PlacementCheckModal from "../components/PlacementCheckModal.jsx";
import { evaluateDeviceStatus, useTick } from "../utils/status.js";

export default function DeviceDashboard() {
  const { deviceId } = useParams();
  const [info, setInfo] = useState(null);
  const [live, setLive] = useState(null);
  const [history, setHistory] = useState(null);
  const [lastReceivedAt, setLastReceivedAt] = useState(null);
  const [isPlacementOpen, setIsPlacementOpen] = useState(false);
  const [updatingConfig, setUpdatingConfig] = useState(false);

  const nowMs = useTick(1000);

  useEffect(() => {
    const infoRef = ref(db, `devices/${deviceId}/info`);
    const liveRef = ref(db, `devices/${deviceId}/live`);
    const historyRef = ref(db, `devices/${deviceId}/history`);

    let isInitialInfo = true;
    let isInitialLive = true;

    const unsubInfo = onValue(infoRef, (snap) => {
      setInfo(snap.val());
      if (!isInitialInfo) {
        setLastReceivedAt(Date.now());
      } else {
        isInitialInfo = false;
      }
    });

    const unsubLive = onValue(liveRef, (snap) => {
      setLive(snap.val());
      if (!isInitialLive) {
        setLastReceivedAt(Date.now());
      } else {
        isInitialLive = false;
      }
    });

    const unsubHistory = onValue(historyRef, (snap) => {
      setHistory(snap.val());
    });

    return () => {
      unsubInfo();
      unsubLive();
      unsubHistory();
    };
  }, [deviceId]);

  const status = evaluateDeviceStatus({
    info,
    live,
    lastReceivedAt,
    nowMs,
  });

  const handleToggleConfigMode = async (newVal) => {
    try {
      setUpdatingConfig(true);
      const configRef = ref(db, `devices/${deviceId}/info/configMode`);
      await set(configRef, newVal);
    } catch (err) {
      console.error("Failed to update configMode in Firebase:", err);
      alert("Failed to update Config Mode in Firebase. Please check Database rules.");
    } finally {
      setUpdatingConfig(false);
    }
  };

  const isConfigActive = Boolean(info?.configMode);

  return (
    <div className="page argus-page">
      {/* Header Bar */}
      <ArgusHeader
        deviceName={info?.deviceName || "Argus Sleep Node"}
        deviceId={deviceId}
        online={status.online}
        lastSeenText={status.lastSeenText}
        rssi={info?.rssi}
        configMode={isConfigActive}
        showBack={true}
      />

      {/* Prominent Banner when Config Mode is Active */}
      {isConfigActive && (
        <div className="argus-config-active-banner">
          <div className="config-banner-header">
            <div className="config-banner-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>CONFIG MODE ACTIVE (WiFi / OTA Update Mode)</span>
            </div>
            <button
              className="config-exit-btn"
              onClick={() => handleToggleConfigMode(false)}
              disabled={updatingConfig}
            >
              {updatingConfig ? "Updating..." : "Exit Config Mode"}
            </button>
          </div>
          <p className="config-banner-desc">
            The device is currently set to <strong>configMode = true</strong> in Firebase. The ESP32 is ready for WiFi credential updates, Access Point pairing, or Over-The-Air (OTA) firmware updates.
          </p>
          <div className="config-meta-row">
            {info?.ip && <span>IP: <strong>{info.ip}</strong></span>}
            {info?.fw && <span>Firmware: <strong>v{info.fw}</strong></span>}
            {info?.timeStr && <span>Device Time: <strong>{info.timeStr}</strong></span>}
          </div>
        </div>
      )}

      {/* 1. Live Data Section */}
      <LiveDataSection live={live} online={status.online} />

      {/* 2. Composite Telemetry Section */}
      <CompositeSection live={live} />

      {/* 3. Nightly Telemetry Section (nightly) */}
      <NightlySection live={live} />

      {/* 4. Session History & Staging Timeline Section (/history) */}
      <HistorySection deviceId={deviceId} history={history} />


      {/* Device Controls & Settings Section */}
      <DeviceSettingsPanel
        configMode={isConfigActive}
        onToggleConfigMode={handleToggleConfigMode}
        onOpenPlacementCheck={() => setIsPlacementOpen(true)}
        updatingConfig={updatingConfig}
      />

      {/* Footer Specs */}
      <footer className="argus-footer">
        <span>Argus Node Sequence: #{live?.seq ?? 0}</span>
        {info?.ip && <span>IP: {info.ip}</span>}
        {info?.fw && <span>FW: v{info.fw}</span>}
        <span>Config Mode: {isConfigActive ? "ACTIVE (true)" : "DISABLED (false)"}</span>
        <span>Radar Link: {live?.radarOk ? "HEALTHY" : "DOWN"}</span>
      </footer>

      {/* Placement Check & Signal Calibration Modal */}
      <PlacementCheckModal
        isOpen={isPlacementOpen}
        onClose={() => setIsPlacementOpen(false)}
        live={live}
        deviceId={deviceId}
      />
    </div>
  );
}



