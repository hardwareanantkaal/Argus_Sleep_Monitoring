import { useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

// Opens the camera and calls onScan(decodedText) once a QR code is read.
// The manufacturing app's QR encodes the device's raw MAC as plain text
// (e.g. "AA:BB:CC:DD:EE:FF") — decodedText is that string, verbatim.
export default function QrScanner({ onScan, onClose }) {
  const elementId = `argus-qr-scanner-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const scanner = new Html5Qrcode(elementId);
    let cancelled = false;

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    const onDecoded = (decodedText) => {
      if (cancelled) return;
      cancelled = true;
      scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => {})
        .finally(() => onScanRef.current(decodedText));
    };
    const onDecodeFail = () => {
      // Per-frame "no QR found yet" — expected continuously while aiming, ignore.
    };

    // Prefer the rear camera; not every device (laptops, some tablets) has one,
    // so fall back to whatever camera is available instead of failing outright.
    const startPromise = scanner
      .start({ facingMode: "environment" }, config, onDecoded, onDecodeFail)
      .catch(() =>
        scanner.start({ facingMode: "user" }, config, onDecoded, onDecodeFail)
      )
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((err) => {
        console.error("Failed to start camera:", err);
        if (!cancelled) setError("Couldn't access the camera. Check permissions and try again.");
      });

    return () => {
      cancelled = true;
      // Only stop once start (or its fallback) has actually settled — stopping a
      // scanner mid-start throws and can leave the camera stream stuck open,
      // which is what happens under React StrictMode's double-invoked effects.
      startPromise.finally(() => {
        scanner
          .stop()
          .then(() => scanner.clear())
          .catch(() => {});
      });
    };
  }, [elementId]);

  return (
    <div className="placement-modal-overlay" onClick={onClose}>
      <div className="placement-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top-handle" />

        <div className="placement-modal-header">
          <h2 className="placement-modal-title">Scan Device QR</h2>
          <button className="placement-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {error ? (
          <p className="auth-error">{error}</p>
        ) : (
          <p className="argus-muted-text qr-scanner-hint">
            {ready ? "Point your camera at the QR code printed on the device." : "Starting camera…"}
          </p>
        )}

        <div id={elementId} className="qr-scanner-region" />
      </div>
    </div>
  );
}
