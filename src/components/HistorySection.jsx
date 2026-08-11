import React, { useState } from "react";
import { db } from "../firebase.js";
import { ref, remove } from "firebase/database";
import SleepStageChart from "./SleepStageChart.jsx";

export default function HistorySection({ deviceId, history }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const sessionEntries = history && typeof history === "object" ? Object.entries(history) : [];

  // Sort sessions with active/recent sessions first
  const sortedSessions = sessionEntries.sort((a, b) => {
    const aVal = a[1] || {};
    const bVal = b[1] || {};
    if (aVal.inProgress && !bVal.inProgress) return -1;
    if (!aVal.inProgress && bVal.inProgress) return 1;
    return b[0].localeCompare(a[0]);
  });

  const [selectedSessionId, setSelectedSessionId] = useState(
    sortedSessions.length > 0 ? sortedSessions[0][0] : null
  );

  // Keep selected ID valid if list updates
  const activeSessionId = selectedSessionId && history?.[selectedSessionId]
    ? selectedSessionId
    : (sortedSessions.length > 0 ? sortedSessions[0][0] : null);

  const activeSession = activeSessionId ? history[activeSessionId] : null;

  const handleRemoveSession = async (sessionId) => {
    if (!sessionId) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to permanently remove session "${sessionId}" ?`
    );
    if (!confirmDelete) return;

    try {
      setIsDeleting(true);
      const sessionRef = ref(db, `devices/${deviceId}/history/${sessionId}`);
      await remove(sessionRef);
      alert(`Session "${sessionId}" has been removed from Firebase.`);
    } catch (err) {
      console.error("Failed to remove session:", err);
      alert("Failed to delete session. Please check Firebase rules.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section className="dashboard-section history-section" style={{ marginTop: "36px" }}>
      <div className="section-header-row">
        <span className="section-badge purple-bg">5. HISTORY</span>
        <h2 className="section-title-bold">Session History & Staging Logs (/history)</h2>
        <span className="section-subtitle-muted">
          · {sortedSessions.length} {sortedSessions.length === 1 ? "Session" : "Sessions"} Recorded
        </span>
      </div>

      {sortedSessions.length === 0 ? (
        <div className="history-empty-card" style={{ padding: "30px", textAlign: "center", background: "var(--bg-card)", borderRadius: "20px", border: "1px dashed var(--border-card)" }}>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", margin: 0 }}>
            No recorded sleep sessions in /history yet. A session node is initialized when 5 continuous minutes of sleep are detected.
          </p>
        </div>
      ) : (
        <div className="history-container">
          {/* Interactive Session Pill Tabs (No select dropdown) */}
          <div className="history-tabs-row" style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "12px", marginBottom: "20px" }}>
            {sortedSessions.map(([id, session]) => {
              const isActive = id === activeSessionId;
              const inProgress = Boolean(session?.inProgress);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedSessionId(id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 16px",
                    borderRadius: "14px",
                    background: isActive ? "rgba(6, 182, 212, 0.18)" : "var(--bg-card)",
                    border: `1px solid ${isActive ? "var(--cyan-accent)" : "var(--border-card)"}`,
                    color: isActive ? "var(--cyan-accent)" : "var(--text-main)",
                    fontWeight: isActive ? "700" : "600",
                    fontSize: "13px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.2s ease",
                  }}
                >
                  <span>{id}</span>
                  {inProgress ? (
                    <span className="argus-chip-small green-chip" style={{ fontSize: "10px", padding: "2px 6px" }}>
                      LIVE
                    </span>
                  ) : (
                    <span className="argus-chip-small muted-chip" style={{ fontSize: "10px", padding: "2px 6px" }}>
                      {session?.sleepMin ?? 0}m
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected Session Details Card */}
          {activeSession && (
            <div className="argus-card history-detail-card" style={{ padding: "24px" }}>
              <div className="argus-card-header" style={{ borderBottom: "1px solid var(--border-card)", paddingBottom: "14px", marginBottom: "18px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                    <h3 style={{ fontSize: "18px", fontWeight: "800", color: "var(--text-main)" }}>
                      Session: {activeSessionId}
                    </h3>
                    <span className={`argus-chip-small ${activeSession.inProgress ? "green-chip" : "muted-chip"}`}>
                      {activeSession.inProgress ? "LIVE IN PROGRESS" : "COMPLETED SESSION"}
                    </span>
                    {/* Delete / Remove Session Button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveSession(activeSessionId)}
                      disabled={isDeleting}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 12px",
                        borderRadius: "10px",
                        background: "rgba(244, 63, 94, 0.15)",
                        border: "1px solid rgba(244, 63, 94, 0.3)",
                        color: "var(--rose-accent)",
                        fontSize: "12px",
                        fontWeight: "700",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      <span>{isDeleting ? "Removing..." : "Delete Session"}</span>
                    </button>
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--text-subtle)", marginTop: "4px" }}>
                    Time Window: <strong>{activeSession.startTime || "—"}</strong> to <strong>{activeSession.endTime || "—"}</strong>
                  </p>
                </div>

                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "28px", fontWeight: "800", color: "var(--cyan-accent)" }}>
                    {activeSession.score ?? 0}
                  </span>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "block" }}>
                    Session Score
                  </span>
                </div>
              </div>

              {/* Primary Session Metrics Grid */}
              <div className="analytics-hero-grid" style={{ marginBottom: "24px" }}>
                <div className="analytics-hero-card">
                  <span className="hero-card-lbl">Asleep Time</span>
                  <div className="hero-card-val-row">
                    <span className="hero-card-val">{activeSession.sleepMin ?? 0}m</span>
                  </div>
                  <span className="hero-card-sub">Total sleep minutes</span>
                </div>

                <div className="analytics-hero-card">
                  <span className="hero-card-lbl">In Bed Time</span>
                  <div className="hero-card-val-row">
                    <span className="hero-card-val cyan-val">{activeSession.bedMin ?? 0}m</span>
                  </div>
                  <span className="hero-card-sub">Total time in bed</span>
                </div>

                <div className="analytics-hero-card">
                  <span className="hero-card-lbl">Deep Rest Ratio</span>
                  <div className="hero-card-val-row">
                    <span className="hero-card-val purple-val">{activeSession.deepPct ?? 0}%</span>
                  </div>
                  <span className="hero-card-sub">{activeSession.deepMin ?? 0} minutes deep</span>
                </div>

                <div className="analytics-hero-card">
                  <span className="hero-card-lbl">Light Rest Ratio</span>
                  <div className="hero-card-val-row">
                    <span className="hero-card-val emerald-val">{activeSession.lightPct ?? 0}%</span>
                  </div>
                  <span className="hero-card-sub">{activeSession.lightMin ?? 0} minutes light</span>
                </div>

                <div className="analytics-hero-card">
                  <span className="hero-card-lbl">Sleep Onset</span>
                  <div className="hero-card-val-row">
                    <span className="hero-card-val amber-val">{activeSession.onsetMin ?? 0}m</span>
                  </div>
                  <span className="hero-card-sub">Time to fall asleep</span>
                </div>
              </div>

              {/* Session Disruptions & Telemetry Row */}
              <div className="composite-metrics-grid" style={{ marginBottom: "24px" }}>
                <div className="argus-stat-item">
                  <div className="stat-item-lbl">Awakenings</div>
                  <div className="stat-item-val-row">
                    <span className="stat-item-val amber-val">{activeSession.wakes ?? 0}</span>
                  </div>
                  <div className="stat-item-sub">Woken up count</div>
                </div>

                <div className="argus-stat-item">
                  <div className="stat-item-lbl">Turnovers</div>
                  <div className="stat-item-val-row">
                    <span className="stat-item-val purple-val">{activeSession.turns ?? 0}</span>
                  </div>
                  <div className="stat-item-sub">Body rotation count</div>
                </div>

                <div className="argus-stat-item">
                  <div className="stat-item-lbl">Apnea Events</div>
                  <div className="stat-item-val-row">
                    <span className="stat-item-val rose-val">{activeSession.apnea ?? 0}</span>
                  </div>
                  <div className="stat-item-sub">Breathing pause count</div>
                </div>

                <div className="argus-stat-item">
                  <div className="stat-item-lbl">Avg Heart Rate</div>
                  <div className="stat-item-val-row">
                    <span className="stat-item-val cyan-val">{activeSession.avgHR ?? 0}</span>
                    <span className="stat-item-unit">BPM</span>
                  </div>
                  <div className="stat-item-sub">Session average</div>
                </div>

                <div className="argus-stat-item">
                  <div className="stat-item-lbl">Avg Respiration</div>
                  <div className="stat-item-val-row">
                    <span className="stat-item-val emerald-val">{activeSession.avgBR ?? 0}</span>
                    <span className="stat-item-unit">RPM</span>
                  </div>
                  <div className="stat-item-sub">Session average</div>
                </div>
              </div>


              {/* Session Sleep Stage Chart */}
              <SleepStageChart
                sleepTimeline={activeSession.sleepTimeline}
                title={`Sleep Stage Timeline Graph — Session ${activeSessionId}`}
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}



