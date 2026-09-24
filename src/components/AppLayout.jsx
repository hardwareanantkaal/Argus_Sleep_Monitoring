import { Outlet } from "react-router-dom";
import { useAllDeviceIds } from "../utils/useAllDeviceIds.js";
import { useHistorySync } from "../utils/useHistorySync.js";

// Runs background jobs for the whole session, on whatever page is open.
function BackgroundJobs() {
  const deviceIds = useAllDeviceIds();
  useHistorySync(deviceIds);
  return null;
}

export default function AppLayout() {
  return (
    <>
      <BackgroundJobs />
      <Outlet />
    </>
  );
}
