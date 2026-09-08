import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { firestore } from "../firebase.js";
import ArgusHeader from "../components/ArgusHeader.jsx";
import { useAuth } from "../utils/AuthContext.jsx";

export default function Profile() {
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getDoc(doc(firestore, "users", user.email))
      .then((snap) => {
        if (cancelled) return;
        const data = snap.data() || {};
        setName(data.name || user.displayName || "");
        setCompany(data.company || "");
        setPhone(data.phone || "");
      })
      .catch((err) => console.error("Failed to load profile:", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user.email, user.displayName]);

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      await setDoc(
        doc(firestore, "users", user.email),
        {
          name: name.trim(),
          company: company.trim(),
          phone: phone.trim(),
          email: user.email,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setSaved(true);
    } catch (err) {
      console.error("Failed to save profile:", err);
      setError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page argus-page">
      <ArgusHeader deviceName="Argus Sleep Monitoring" deviceLabel="PROFILE" showBack={true} showStatus={false} />

      <div className="auth-card">
        <div className="auth-brand">
          <h1 className="auth-title">Your Profile</h1>
          <p className="auth-subtitle">{user.email}</p>
        </div>

        {loading ? (
          <p className="argus-muted-text">Loading profile…</p>
        ) : (
          <form className="auth-form" onSubmit={handleSave}>
            <label className="auth-field">
              <span className="auth-field-label">Name</span>
              <input
                type="text"
                className="argus-search-input auth-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>

            <label className="auth-field">
              <span className="auth-field-label">Company</span>
              <input
                type="text"
                className="argus-search-input auth-input"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
              />
            </label>

            <label className="auth-field">
              <span className="auth-field-label">Phone</span>
              <input
                type="tel"
                className="argus-search-input auth-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>

            <label className="auth-field">
              <span className="auth-field-label">Email</span>
              <input type="email" className="argus-search-input auth-input" value={user.email || ""} disabled />
            </label>

            {error && <p className="auth-error">{error}</p>}
            {saved && <p className="auth-success">Profile updated.</p>}

            <button type="submit" className="auth-submit-btn" disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
