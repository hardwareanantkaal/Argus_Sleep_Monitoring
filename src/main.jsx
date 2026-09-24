import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./components/AppLayout.jsx";
import DeviceList from "./pages/DeviceList.jsx";
import DeviceDashboard from "./pages/DeviceDashboard.jsx";
import DeviceHistory from "./pages/DeviceHistory.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DeviceList />} />
          <Route path="/device/:deviceId" element={<DeviceDashboard />} />
          <Route path="/device/:deviceId/history" element={<DeviceHistory />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
