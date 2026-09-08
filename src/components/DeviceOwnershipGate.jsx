import { Link } from "react-router-dom";

export default function DeviceOwnershipGate({
  ownershipChecked,
  isOwned,
  linking,
  linkError,
  onLink,
  children,
}) {
  if (!ownershipChecked) {
    return (
      <div className="auth-page">
        <p className="argus-muted-text">Checking device access…</p>
      </div>
    );
  }

  if (!isOwned) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-brand">
            <h1 className="auth-title">Device not linked</h1>
            <p className="auth-subtitle">This device isn't linked to your account yet.</p>
          </div>
          {linkError && <p className="auth-error">{linkError}</p>}
          <button className="auth-submit-btn" onClick={onLink} disabled={linking}>
            {linking ? "Linking…" : "Link This Device"}
          </button>
          <p className="auth-switch-text">
            <Link to="/">Back to all devices</Link>
          </p>
        </div>
      </div>
    );
  }

  return children;
}
