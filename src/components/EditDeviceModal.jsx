import { useState } from "react";
import { updateDeviceDetails, unlinkDeviceFromUser } from "../utils/deviceLinks.js";

export default function EditDeviceModal({ email, device, onClose, onDeleted }) {
  const [name, setName] = useState(device.displayName || device.label || "");
  const [room, setRoom] = useState(device.room || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async (e) => {
    e.preventDefault();
    if (saving || deleting) return;
    setError("");
    setSaving(true);
    try {
      await updateDeviceDetails(email, device.id, { displayName: name, room });
      onClose();
    } catch (err) {
      console.error("Failed to update device:", err);
      setError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (saving || deleting) return;
    const confirmDelete = window.confirm(
      "Remove this monitor from your account? This won't delete the device's data."
    );
    if (!confirmDelete) return;

    setError("");
    setDeleting(true);
    try {
      await unlinkDeviceFromUser(email, device.id);
      onDeleted?.();
      onClose();
    } catch (err) {
      console.error("Failed to unlink device:", err);
      setError("Failed to remove monitor. Please try again.");
      setDeleting(false);
    }
  };

  return (
    <div className="placement-modal-overlay" onClick={onClose}>
      <div className="placement-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top-handle" />

        <div className="placement-modal-header">
          <h2 className="placement-modal-title">Edit Monitor</h2>
          <button className="placement-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSave}>
          <label className="auth-field">
            <span className="auth-field-label">Device name</span>
            <input
              type="text"
              className="argus-search-input auth-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={device.label}
            />
          </label>

          <label className="auth-field">
            <span className="auth-field-label">Room or person (optional)</span>
            <input
              type="text"
              className="argus-search-input auth-input"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder="e.g. Bedroom, or a name"
            />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-submit-btn" disabled={saving || deleting}>
            {saving ? "Saving…" : "Save Changes"}
          </button>

          <button
            type="button"
            className="edit-device-delete-btn"
            onClick={handleDelete}
            disabled={saving || deleting}
          >
            {deleting ? "Removing…" : "Delete Monitor"}
          </button>
        </form>
      </div>
    </div>
  );
}
