import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DeviceList from "./pages/DeviceList.jsx";
import DeviceDashboard from "./pages/DeviceDashboard.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DeviceList />} />
        <Route path="/device/:deviceId" element={<DeviceDashboard />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
