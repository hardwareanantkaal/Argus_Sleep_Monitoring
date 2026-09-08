import { Outlet } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute.jsx";
import { useAuth } from "../utils/AuthContext.jsx";
import { useLinkedDeviceIds } from "../utils/useLinkedDeviceIds.js";
import { useHistorySync } from "../utils/useHistorySync.js";
import { useEnsureDeviceLabels } from "../utils/useEnsureDeviceLabels.js";

// Runs background jobs for the whole authenticated session, on whatever page
// the user happens to be — not just while a specific device page is open.
function BackgroundJobs() {
  const { user } = useAuth();
  const linkedIds = useLinkedDeviceIds(user?.email);
  useHistorySync(user?.email, linkedIds);
  useEnsureDeviceLabels(user?.email);
  return null;
}

export default function AppLayout() {
  return (
    <ProtectedRoute>
      <BackgroundJobs />
      <Outlet />
    </ProtectedRoute>
  );
}
