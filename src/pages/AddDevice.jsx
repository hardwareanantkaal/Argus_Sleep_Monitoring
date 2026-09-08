import { lazy, Suspense, useState } from "react";
import { useNavigate } from "react-router-dom";
import ArgusHeader from "../components/ArgusHeader.jsx";
import { useAuth } from "../utils/AuthContext.jsx";
import { claimAndLinkDevice } from "../utils/manufacturedDevices.js";

// html5-qrcode pulls in a sizeable decoder — only load it once someone actually
// opens the scanner, instead of shipping it in the main bundle for everyone.
const QrScanner = lazy(() => import("../components/QrScanner.jsx"));

export default function AddDevice() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [deviceId, setDeviceId] = useState("");
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const linkDeviceById = async (rawId) => {
    if (!rawId?.trim() || linking) return;

    setError("");
    setSuccess(false);
    setLinking(true);
    try {
      const id = await claimAndLinkDevice(user.email, rawId);
      setSuccess(true);
      setTimeout(() => navigate(`/device/${id}`), 600);
    } catch (err) {
      setError(err.message || "Failed to link device.");
    } finally {
      setLinking(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    linkDeviceById(deviceId);
  };

  const handleScan = (decodedText) => {
    setShowScanner(false);
    setDeviceId(decodedText);
    linkDeviceById(decodedText);
  };

  return (
    <div className="page argus-page">
      <ArgusHeader deviceName="Argus Sleep Monitoring" deviceLabel="ADD DEVICE" showBack={true} showStatus={false} />

      <div className="auth-card">
        <div className="auth-brand">
          <h1 className="auth-title">Add a Device</h1>
          <p className="auth-subtitle">
            Scan the QR code printed on your Argus sensor node, or enter its device ID to link it to your account.
          </p>
        </div>

        <button type="button" className="auth-submit-btn qr-scan-btn" onClick={() => setShowScanner(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M3 7V5a2 2 0 0 1 2-2h2" />
            <path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
            <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
            <line x1="7" y1="12" x2="17" y2="12" />
          </svg>
          Scan QR Code
        </button>

        <div className="auth-divider">
          <span>or enter it manually</span>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            <span className="auth-field-label">Device ID</span>
            <input
              type="text"
              className="argus-search-input auth-input"
              placeholder="e.g. AA:BB:CC:DD:EE:FF"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              required
            />
          </label>

          {error && <p className="auth-error">{error}</p>}
          {success && <p className="auth-success">Device linked! Redirecting…</p>}

          <button type="submit" className="auth-submit-btn" disabled={linking || !deviceId.trim()}>
            {linking ? "Linking…" : "Add Device"}
          </button>
        </form>
      </div>

      {showScanner && (
        <Suspense fallback={null}>
          <QrScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
        </Suspense>
      )}
    </div>
  );
}
