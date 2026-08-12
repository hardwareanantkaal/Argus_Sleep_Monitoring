import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { db } from "../firebase.js";
import { ref, onValue } from "firebase/database";
import ArgusHeader from "../components/ArgusHeader.jsx";
import { evaluateDeviceStatus, useTick } from "../utils/status.js";
import { formatInBed, formatPresence, getEffectiveLiveStage, formatMovement } from "../utils/argusEnums.js";

export default function DeviceList() {
  const [devices, setDevices] = useState(null);
  const [lastReceivedMap, setLastReceivedMap] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const nowMs = useTick(1000);

  useEffect(() => {
    const devicesRef = ref(db, "devices");
    const childListeners = new Map();

    const mainUnsub = onValue(
      devicesRef,
      (snapshot) => {
        const data = snapshot.val() || {};
        const deviceIds = Object.keys(data);
        setDevices(data);

        // Remove listeners for devices that are no longer in the database
        for (const [id, unsubFn] of childListeners.entries()) {
          if (!deviceIds.includes(id)) {
            unsubFn();
            childListeners.delete(id);
            setLastReceivedMap((prev) => {
              const next = { ...prev };
              delete next[id];
              return next;
            });
          }
        }

        // Attach a separate listener for each device path: /devices/${id}
        deviceIds.forEach((id) => {
          if (!childListeners.has(id)) {
            let isInitial = true;
            const singleDeviceRef = ref(db, `devices/${id}`);
            const unsubDevice = onValue(
              singleDeviceRef,
              (deviceSnap) => {
                const singleData = deviceSnap.val();
                setDevices((prev) => ({
                  ...prev,
                  [id]: singleData,
                }));

                // Only update lastReceivedMap for THIS specific device when it emits a real-time update
                if (!isInitial) {
                  setLastReceivedMap((prev) => ({
                    ...prev,
                    [id]: Date.now(),
                  }));
                } else {
                  isInitial = false;
                }
              },
              (err) => {
                console.error(`Failed to read /devices/${id}:`, err);
              }
            );
            childListeners.set(id, unsubDevice);
          }
        });
      },
      (err) => {
        console.error("Failed to read /devices:", err);
        setDevices({});
      }
    );

    return () => {
      mainUnsub();
      for (const unsubFn of childListeners.values()) {
        unsubFn();
      }
      childListeners.clear();
    };
  }, []);

  const evaluatedDevices = useMemo(() => {
    if (!devices) return [];

    return Object.entries(devices).map(([id, d]) => {
      const info = d.info || {};
      const live = d.live || {};
      const status = evaluateDeviceStatus({
        info,
        live,
        lastReceivedAt: lastReceivedMap[id],
        nowMs,
      });

      return {
        id,
        info,
        live,
        status,
      };
    });
  }, [devices, lastReceivedMap, nowMs]);

  const summary = useMemo(() => {
    let onlineCount = 0;
    let offlineCount = 0;
    let configCount = 0;

    evaluatedDevices.forEach((dev) => {
      if (dev.status.online) {
        onlineCount++;
        if (dev.info?.configMode) configCount++;
      } else {
        offlineCount++;
      }
    });

    return {
      total: evaluatedDevices.length,
      online: onlineCount,
      offline: offlineCount,
      config: configCount,
    };
  }, [evaluatedDevices]);

  const filteredDevices = useMemo(() => {
    return evaluatedDevices.filter((dev) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        dev.id.toLowerCase().includes(query) ||
        (dev.info.deviceName && dev.info.deviceName.toLowerCase().includes(query));

      if (statusFilter === "online") return matchesSearch && dev.status.online;
      if (statusFilter === "offline") return matchesSearch && !dev.status.online;
      if (statusFilter === "config") return matchesSearch && dev.status.online && Boolean(dev.info?.configMode);
      return matchesSearch;
    });
  }, [evaluatedDevices, searchQuery, statusFilter]);

  return (
    <div className="page argus-page">
      <ArgusHeader
        deviceName="Argus Sleep Monitoring"
        deviceId="MONITOR HUB"
        online={summary.online > 0}
        lastSeenText={`${summary.online} Online Streams`}
        showBack={false}
      />

      {/* Summary Row */}
      <div className="argus-summary-row">
        <div className="argus-summary-card">
          <span className="summary-val-big">{summary.total}</span>
          <span className="summary-lbl-small">Registered Monitors</span>
        </div>

        <div className="argus-summary-card">
          <span className="summary-val-big cyan-text">{summary.online}</span>
          <span className="summary-lbl-small">Active Live Streams</span>
        </div>

        <div className="argus-summary-card">
          <span className="summary-val-big muted-text">{summary.offline}</span>
          <span className="summary-lbl-small">Standby / Offline</span>
        </div>

        <div className="argus-summary-card">
          <span className="summary-val-big amber-text">{summary.config}</span>
          <span className="summary-lbl-small">Config Mode (OTA)</span>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="argus-controls-row">
        <div className="search-wrap">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="argus-search-input"
            placeholder="Search monitor ID or node name…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-pill-group">
          <button
            className={`filter-pill-btn ${statusFilter === "all" ? "active" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            All ({summary.total})
          </button>
          <button
            className={`filter-pill-btn ${statusFilter === "online" ? "active" : ""}`}
            onClick={() => setStatusFilter("online")}
          >
            Online ({summary.online})
          </button>
          <button
            className={`filter-pill-btn ${statusFilter === "config" ? "active" : ""}`}
            onClick={() => setStatusFilter("config")}
          >
            Config Mode ({summary.config})
          </button>
          <button
            className={`filter-pill-btn ${statusFilter === "offline" ? "active" : ""}`}
            onClick={() => setStatusFilter("offline")}
          >
            Offline ({summary.offline})
          </button>
        </div>
      </div>

      {/* Loading state */}
      {devices === null && <p className="argus-muted-text">Connecting to Argus Realtime Network…</p>}

      {/* Empty state */}
      {devices !== null && filteredDevices.length === 0 && (
        <p className="argus-muted-text">
          {summary.total === 0
            ? "No Sensor monitors found in database."
            : "No monitors match your search query."}
        </p>
      )}

      {/* Device Cards Grid */}
      <div className="argus-devices-grid">
        {filteredDevices.map(({ id, info, live, status }) => {
          const inBedStr = formatInBed(live.inBed);
          const presenceStr = formatPresence(live.presence);
          
          const effectiveStage = getEffectiveLiveStage(live);
          const sleepStageStr = effectiveStage.stage;
          
          const rawMotion = formatMovement(live.motion ?? live.movement);
          const motionText = rawMotion === 2 ? "Active" : rawMotion === 1 ? "Still" : "None";

          return (
            <Link to={`/device/${id}`} key={id} className="argus-device-card">
              <div className="card-top-header">
                <span className="device-card-name">{info.deviceName || "Argus Monitor Node"}</span>
                <div className="card-badges-row">
                  {status.online && info.configMode && (
                    <span className="argus-chip-small amber-chip" title="Device in Config / OTA Mode">
                      CONFIG MODE
                    </span>
                  )}
                  <span className={`argus-chip-small ${status.online ? "green-chip" : "muted-chip"}`}>
                    {status.online ? "LIVE" : "OFFLINE"}
                  </span>
                </div>
              </div>


              <div className="device-card-id">{id}</div>

              <div className="device-card-body-grid">
                <div className="card-stat-box">
                  <span className="stat-lbl">Occupancy</span>
                  <span className="stat-val" style={{ color: inBedStr === "In bed" ? "#10b981" : "#94a3b8" }}>
                    {inBedStr}
                  </span>
                </div>

                <div className="card-stat-box">
                  <span className="stat-lbl">Presence</span>
                  <span className="stat-val" style={{ color: presenceStr === "Someone is present" ? "#10b981" : "#94a3b8" }}>
                    {presenceStr === "Someone is present" ? "Present" : "No one"}
                  </span>
                </div>

                <div className="card-stat-box">
                  <span className="stat-lbl">Sleep Stage</span>
                  <span className="stat-val purple-text">
                    {sleepStageStr}
                  </span>
                </div>

                <div className="card-stat-box">
                  <span className="stat-lbl">Movement</span>
                  <span className="stat-val amber-text">
                    {motionText}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}


