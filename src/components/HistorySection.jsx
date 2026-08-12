import React, { useState } from "react";
import { db } from "../firebase.js";
import { ref, remove } from "firebase/database";
import SleepStageChart from "./SleepStageChart.jsx";
import { getDeviceTimestampMs } from "../utils/status.js";

function parseSessionTimeToMs(timeStr) {
  if (timeStr === undefined || timeStr === null || timeStr === "") return null;
  const fakeLive = { timeStr };
  return getDeviceTimestampMs(null, fakeLive);
}

function isSessionInProgress(session, nowMs = Date.now()) {
  if (!session) return false;
  const fbFlag = Boolean(session.inProgress);
  const endMs = parseSessionTimeToMs(session.endTime);
  if (endMs !== null && endMs < nowMs) {
    return false;
  }
  return fbFlag;
}

function formatHoursMinutes(totalMinutes) {
  const mins = Number(totalMinutes);
  if (isNaN(mins) || mins <= 0) return "0m";
  const hrs = Math.floor(mins / 60);
  const remMins = Math.round(mins % 60);

  if (hrs > 0 && remMins > 0) {
    return `${hrs}h ${remMins}m`;
  } else if (hrs > 0) {
    return `${hrs}h`;
  }
  return `${remMins}m`;
}

export default function HistorySection({ deviceId, history }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const sessionEntries = history && typeof history === "object" ? Object.entries(history) : [];

  // Sort sessions with active/recent sessions first (use effective inProgress)
  const sortedSessions = sessionEntries.sort((a, b) => {
    const aVal = a[1] || {};
    const bVal = b[1] || {};
    const aLive = isSessionInProgress(aVal);
    const bLive = isSessionInProgress(bVal);
    if (aLive && !bLive) return -1;
    if (!aLive && bLive) return 1;
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

  const csvEscape = (val) => {
    if (val === undefined || val === null) return "";
    const s = String(val);
    if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const buildSessionCsv = (sessionId, session) => {
    const lines = [];

    const summaryFields = [
      ["Session ID", sessionId],
      ["Device ID", deviceId ?? ""],
      ["Status", isSessionInProgress(session) ? "LIVE IN PROGRESS" : "COMPLETED"],
      ["Start Time", session?.startTime ?? ""],
      ["End Time", session?.endTime ?? ""],
      ["Score", session?.score ?? 0],
      ["Asleep (min)", session?.sleepMin ?? 0],
      ["Asleep (formatted)", formatHoursMinutes(session?.sleepMin ?? 0)],
      ["In Bed (min)", session?.bedMin ?? 0],
      ["In Bed (formatted)", formatHoursMinutes(session?.bedMin ?? 0)],
      ["Sleep Onset (min)", session?.onsetMin ?? 0],
      ["Deep Sleep (min)", session?.deepMin ?? 0],
      ["Deep %", session?.deepPct ?? 0],
      ["Light Sleep (min)", session?.lightMin ?? 0],
      ["Light %", session?.lightPct ?? 0],
      ["Awakenings", session?.wakes ?? 0],
      ["Turnovers", session?.turns ?? 0],
      ["Apnea Events", session?.apnea ?? 0],
      ["Avg Heart Rate (BPM)", session?.avgHR ?? 0],
      ["Avg Respiration (RPM)", session?.avgBR ?? 0],
      ["Exported At", new Date().toLocaleString()],
    ];

    lines.push(["=== Argus Sleep Session Summary (one row: headers above, values below) ==="]);
    lines.push(summaryFields.map(([k]) => csvEscape(k)));
    lines.push(summaryFields.map(([, v]) => csvEscape(v)));
    lines.push([]);
    lines.push([]);

    lines.push(["=== Sleep Stage Timeline (each row = one stage transition) ==="]);
    lines.push(["Time", "Sleep Stage"]);
    if (session?.sleepTimeline && typeof session.sleepTimeline === "object") {
      Object.entries(session.sleepTimeline)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([t, stage]) => {
          lines.push([csvEscape(t), csvEscape(stage)]);
        });
    } else {
      lines.push(["(no timeline data)", ""]);
    }

    return lines.map((row) => (Array.isArray(row) ? row.join(",") : row)).join("\r\n");
  };

  const handleDownloadCsv = (sessionId, session) => {
    if (!sessionId || !session) return;
    const csv = buildSessionCsv(sessionId, session);
    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeDev = String(deviceId ?? "unknownDevice").replace(/[^\w.-]+/g, "_");
    const safeSes = String(sessionId).replace(/[^\w.-]+/g, "_");
    a.href = url;
    a.download = `Argus-${safeDev}-${safeSes}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
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
          {/* Interactive Session Pill Tabs */}
          <div className="history-tabs-row" style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "12px", marginBottom: "20px" }}>
            {sortedSessions.map(([id, session]) => {
              const isActive = id === activeSessionId;
              const inProgress = isSessionInProgress(session);
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
                      {formatHoursMinutes(session?.sleepMin ?? 0)}
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
                    {(() => {
                      const liveNow = isSessionInProgress(activeSession);
                      return (
                        <span className={`argus-chip-small ${liveNow ? "green-chip" : "muted-chip"}`}>
                          {liveNow ? "LIVE IN PROGRESS" : "COMPLETED SESSION"}
                        </span>
                      );
                    })()}
                    {/* Download CSV Button */}
                    <button
                      type="button"
                      onClick={() => handleDownloadCsv(activeSessionId, activeSession)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 12px",
                        borderRadius: "10px",
                        background: "rgba(16, 185, 129, 0.15)",
                        border: "1px solid rgba(16, 185, 129, 0.3)",
                        color: "#10b981",
                        fontSize: "12px",
                        fontWeight: "700",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      <span>Download CSV</span>
                    </button>
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
                    <span className="hero-card-val">{formatHoursMinutes(activeSession.sleepMin ?? 0)}</span>
                  </div>
                  <span className="hero-card-sub">{activeSession.sleepMin ?? 0} total sleep minutes</span>
                </div>

                <div className="analytics-hero-card">
                  <span className="hero-card-lbl">In Bed Time</span>
                  <div className="hero-card-val-row">
                    <span className="hero-card-val cyan-val">{formatHoursMinutes(activeSession.bedMin ?? 0)}</span>
                  </div>
                  <span className="hero-card-sub">{activeSession.bedMin ?? 0} total time in bed</span>
                </div>

                <div className="analytics-hero-card">
                  <span className="hero-card-lbl">Deep Rest Ratio</span>
                  <div className="hero-card-val-row">
                    <span className="hero-card-val purple-val">{activeSession.deepPct ?? 0}%</span>
                  </div>
                  <span className="hero-card-sub">{formatHoursMinutes(activeSession.deepMin ?? 0)} ({activeSession.deepMin ?? 0}m deep)</span>
                </div>

                <div className="analytics-hero-card">
                  <span className="hero-card-lbl">Light Rest Ratio</span>
                  <div className="hero-card-val-row">
                    <span className="hero-card-val emerald-val">{activeSession.lightPct ?? 0}%</span>
                  </div>
                  <span className="hero-card-sub">{formatHoursMinutes(activeSession.lightMin ?? 0)} ({activeSession.lightMin ?? 0}m light)</span>
                </div>

                <div className="analytics-hero-card">
                  <span className="hero-card-lbl">Sleep Onset</span>
                  <div className="hero-card-val-row">
                    <span className="hero-card-val amber-val">{formatHoursMinutes(activeSession.onsetMin ?? 0)}</span>
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



