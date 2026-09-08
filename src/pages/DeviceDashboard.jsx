import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebase.js";
import { ref, onValue, set } from "firebase/database";

import ArgusHeader from "../components/ArgusHeader.jsx";
import LiveDataSection from "../components/LiveDataSection.jsx";
import CompositeSection from "../components/CompositeSection.jsx";
import NightlySection from "../components/NightlySection.jsx";
import DeviceSettingsPanel from "../components/DeviceSettingsPanel.jsx";
import PlacementCheckModal from "../components/PlacementCheckModal.jsx";
import DeviceOwnershipGate from "../components/DeviceOwnershipGate.jsx";
import DeviceSwitcher from "../components/DeviceSwitcher.jsx";
import { evaluateDeviceStatus, useTick } from "../utils/status.js";
import { useAuth } from "../utils/AuthContext.jsx";
import { useDeviceOwnership } from "../utils/useDeviceOwnership.js";
import { getDeviceDisplayName } from "../utils/deviceDisplay.js";
import { setLastDeviceId } from "../utils/lastDevice.js";

export default function DeviceDashboard() {
  const { deviceId: rawDeviceId } = useParams();
  const { user } = useAuth();
  const [info, setInfo] = useState(null);
  const [live, setLive] = useState(null);
  const [lastReceivedAt, setLastReceivedAt] = useState(null);
  const [isPlacementOpen, setIsPlacementOpen] = useState(false);
  const [updatingConfig, setUpdatingConfig] = useState(false);

  const { ownershipChecked, isOwned, deviceRecord, deviceId, linking, linkError, linkThisDevice } = useDeviceOwnership(
    user.email,
    rawDeviceId
  );

  const nowMs = useTick(1000);

  // Remember this as the last-viewed device, for the sidebar's Live Stream / History shortcuts
  useEffect(() => {
    if (isOwned) setLastDeviceId(deviceId);
  }, [isOwned, deviceId]);

  useEffect(() => {
    if (!isOwned) return;
    const infoRef = ref(db, `devices/${deviceId}/info`);
    const liveRef = ref(db, `devices/${deviceId}/live`);

    let isInitialLive = true;

    const unsubInfo = onValue(infoRef, (snap) => {
      setInfo(snap.val());
    });

    const unsubLive = onValue(liveRef, (snap) => {
      setLive(snap.val());
      if (!isInitialLive) {
        setLastReceivedAt(Date.now());
      } else {
        isInitialLive = false;
      }
    });

    return () => {
      unsubInfo();
      unsubLive();
    };
  }, [isOwned, deviceId]);

  const status = evaluateDeviceStatus({
    info,
    live,
    lastReceivedAt,
    nowMs,
  });

  // Automatically reset configMode = false in Firebase if the device is offline
  useEffect(() => {
    if (info && !status.online && info.configMode) {
      const configRef = ref(db, `devices/${deviceId}/info/configMode`);
      set(configRef, false).catch((err) => {
        console.error("Auto-clearing configMode for offline device failed:", err);
      });
    }
  }, [info, status.online, deviceId]);

  const handleToggleConfigMode = async (newVal) => {
    if (!status.online) {
      alert(`Device is offline (last active: ${status.lastSeenText || "unknown"}). Turn on your Argus sensor node before toggling Config Mode.`);
      return;
    }

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

  // Config Mode is ONLY active if device is currently ONLINE
  const isConfigActive = status.online && Boolean(info?.configMode);

  return (
    <DeviceOwnershipGate
      ownershipChecked={ownershipChecked}
      isOwned={isOwned}
      linking={linking}
      linkError={linkError}
      onLink={linkThisDevice}
    >
      <div className="page argus-page">
        {/* Header Bar */}
        <ArgusHeader
          deviceName={getDeviceDisplayName(deviceRecord)}
          deviceLabel={deviceRecord?.room}
          online={status.online}
          lastSeenText={status.lastSeenText}
          rssi={info?.rssi}
          configMode={isConfigActive}
          showBack={true}
        />

        <DeviceSwitcher activeDeviceId={deviceId} hrefFor={(id) => `/device/${id}`} />

        {/* Warning banner when this device is offline */}
        {!status.online && (
          <div className="argus-offline-warning-banner">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
            <span>This device is offline — showing the last data received ({status.lastSeenText || "no data yet"}).</span>
          </div>
        )}

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
                disabled={updatingConfig || !status.online}
              >
                {updatingConfig ? "Updating..." : !status.online ? "Device Offline" : "Exit Config Mode"}
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

        {/* 3. Nightly Telemetry Section — overall summary of tonight's session */}
        <NightlySection live={live} />

        {/* Device Controls & Settings Section */}
        <DeviceSettingsPanel
          configMode={isConfigActive}
          onToggleConfigMode={handleToggleConfigMode}
          onOpenPlacementCheck={() => setIsPlacementOpen(true)}
          updatingConfig={updatingConfig}
          online={status.online}
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
          online={status.online}
        />
      </div>
    </DeviceOwnershipGate>
  );
}
