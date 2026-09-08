import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../utils/AuthContext.jsx";
import { useLinkedDevices } from "../utils/useLinkedDevices.js";
import { useDevicesData } from "../utils/useDevicesData.js";
import { getDeviceDisplayName } from "../utils/deviceDisplay.js";

// Lets you switch which linked device you're viewing without leaving the
// Live Stream / History page — shown at the top of both.
export default function DeviceSwitcher({ activeDeviceId, hrefFor }) {
  const { user } = useAuth();
  const linkedDevices = useLinkedDevices(user?.email);
  const idsKey = linkedDevices ? linkedDevices.map((d) => d.id).join(",") : "";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const linkedIds = useMemo(() => (linkedDevices ? idsKey.split(",").filter(Boolean) : null), [idsKey]);

  const statusData = useDevicesData(linkedIds);
  const liveStatusById = {};
  statusData.forEach((d) => {
    liveStatusById[d.id] = d.status;
  });

  if (linkedDevices === null) return null;

  if (linkedDevices.length === 0) {
    return (
      <div className="device-switcher-empty">
        No monitors linked yet. <Link to="/add-device">Add one</Link>.
      </div>
    );
  }

  return (
    <div className="device-switcher">
      {linkedDevices.map((device) => {
        const online = Boolean(liveStatusById[device.id]?.online);
        return (
          <Link
            key={device.id}
            to={hrefFor(device.id)}
            className={`device-switcher-chip ${device.id === activeDeviceId ? "active" : ""}`}
          >
            <span className={`device-switcher-dot ${online ? "online" : "offline"}`} />
            <span className="device-switcher-name">{getDeviceDisplayName(device)}</span>
          </Link>
        );
      })}
    </div>
  );
}
