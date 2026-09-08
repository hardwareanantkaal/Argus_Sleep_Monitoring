import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import ArgusHeader from "../components/ArgusHeader.jsx";
import EditDeviceModal from "../components/EditDeviceModal.jsx";
import { useAuth } from "../utils/AuthContext.jsx";
import { useLinkedDevices } from "../utils/useLinkedDevices.js";
import { useDevicesData } from "../utils/useDevicesData.js";
import { getDeviceDisplayName } from "../utils/deviceDisplay.js";
import { formatInBed, formatPresence, getEffectiveLiveStage, formatMovement } from "../utils/argusEnums.js";

export default function DeviceList() {
  const { user } = useAuth();
  const linkedDevices = useLinkedDevices(user?.email);
  const idsKey = linkedDevices ? linkedDevices.map((d) => d.id).join(",") : "";
  const linkedIds = useMemo(
    () => (linkedDevices ? idsKey.split(",").filter(Boolean) : null),
    [linkedDevices, idsKey]
  );
  const liveData = useDevicesData(linkedIds);
  const liveById = useMemo(() => {
    const map = {};
    liveData.forEach((d) => {
      map[d.id] = d;
    });
    return map;
  }, [liveData]);

  const evaluatedDevices = useMemo(() => {
    if (!linkedDevices) return [];
    return linkedDevices.map((device) => ({
      device,
      ...(liveById[device.id] || {
        info: {},
        live: {},
        status: { online: false },
        found: false,
      }),
    }));
  }, [linkedDevices, liveById]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingDevice, setEditingDevice] = useState(null);

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
      const displayName = getDeviceDisplayName(dev.device);
      const matchesSearch =
        !query ||
        displayName.toLowerCase().includes(query) ||
        (dev.device.room && dev.device.room.toLowerCase().includes(query));

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
        deviceLabel="DEVICE HUB"
        online={summary.online > 0}
        lastSeenText={`${summary.online} Online Streams`}
        showBack={false}
      />

      {/* Add Device */}
      {/* <div className="argus-add-device-row">
        <Link to="/add-device" className="auth-submit-btn argus-add-device-btn">
          + Add Device
        </Link>
      </div> */}

      {/* Summary Row */}
      <div className="argus-summary-row">
        <div className="argus-summary-card">
          <span className="summary-val-big">{summary.total}</span>
          <span className="summary-lbl-small">Registered Devices</span>
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
            placeholder="Search Device or room name…"
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
      {linkedDevices === null && <p className="argus-muted-text">Connecting to Argus Realtime Network…</p>}

      {/* Empty state */}
      {linkedDevices !== null && filteredDevices.length === 0 && (
        <p className="argus-muted-text">
          {summary.total === 0
            ? "No devices linked to your account yet. Use \"Add Device\" above to link one."
            : "No devices match your search query."}
        </p>
      )}

      {/* Device Cards Grid */}
      <div className="argus-devices-grid">
        {filteredDevices.map(({ device, info, live, status, found }) => {
          const inBedStr = formatInBed(live.inBed);
          const presenceStr = formatPresence(live.presence);

          const effectiveStage = getEffectiveLiveStage(live);
          const sleepStageStr = effectiveStage.stage;

          const rawMotion = formatMovement(live.motion ?? live.movement);
          const motionText = rawMotion === 2 ? "Active" : rawMotion === 1 ? "Still" : "None";

          return (
            <div key={device.id} className="argus-device-card-wrap">
              <button
                className="argus-device-edit-btn"
                title="Edit this Device"
                onClick={(e) => {
                  e.preventDefault();
                  setEditingDevice(device);
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
                </svg>
              </button>
              <div className="argus-device-card">
                <div className="card-top-header">
                  <span className="device-card-name">{getDeviceDisplayName(device)}</span>
                  <div className="card-badges-row">
                    {status.online && info.configMode && (
                      <span className="argus-chip-small amber-chip" title="Device in Config / OTA Mode">
                        CONFIG MODE
                      </span>
                    )}
                    <span className={`argus-chip-small ${status.online ? "green-chip" : "muted-chip"}`}>
                      {found ? (status.online ? "LIVE" : "OFFLINE") : "NO DATA"}
                    </span>
                  </div>
                </div>

                {device.room && <div className="device-card-id">{device.room}</div>}

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
                    <span className="stat-val purple-text">{sleepStageStr}</span>
                  </div>

                  <div className="card-stat-box">
                    <span className="stat-lbl">Movement</span>
                    <span className="stat-val amber-text">{motionText}</span>
                  </div>
                </div>

                <div className="device-card-actions">
                  <Link to={`/device/${device.id}`} className="device-card-action-btn live">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="2" />
                      <path d="M8.5 8.5a5 5 0 0 0 0 7" />
                      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                    </svg>
                    Live Data
                  </Link>
                  <Link to={`/device/${device.id}/history`} className="device-card-action-btn history">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="9" />
                      <polyline points="12 7 12 12 16 14" />
                    </svg>
                    History
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editingDevice && (
        <EditDeviceModal
          email={user.email}
          device={editingDevice}
          onClose={() => setEditingDevice(null)}
        />
      )}
    </div>
  );
}
