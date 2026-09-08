import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./utils/AuthContext.jsx";
import AppLayout from "./components/AppLayout.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import DeviceList from "./pages/DeviceList.jsx";
import DeviceDashboard from "./pages/DeviceDashboard.jsx";
import DeviceHistory from "./pages/DeviceHistory.jsx";
import AddDevice from "./pages/AddDevice.jsx";
import Profile from "./pages/Profile.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<AppLayout />}>
            <Route path="/" element={<DeviceList />} />
            <Route path="/device/:deviceId" element={<DeviceDashboard />} />
            <Route path="/device/:deviceId/history" element={<DeviceHistory />} />
            <Route path="/add-device" element={<AddDevice />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
