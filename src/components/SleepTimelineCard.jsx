import React from "react";
import { parseSleepTimeline, getLatestTimelineStage } from "../utils/argusEnums.js";

export default function SleepTimelineCard({ sleepTimeline }) {
  const parsed = parseSleepTimeline(sleepTimeline);
  const latest = getLatestTimelineStage(sleepTimeline);

  const getStageColor = (stage) => {
    const s = (stage || "").toLowerCase();
    if (s.includes("deep")) return { color: "#818cf8", bg: "rgba(129, 140, 248, 0.18)" };
    if (s.includes("light") || s.includes("shallow")) return { color: "#06b6d4", bg: "rgba(6, 182, 212, 0.18)" };
    if (s.includes("awake")) return { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.18)" };
    return { color: "#94a3b8", bg: "rgba(148, 163, 184, 0.12)" };
  };

  return (
    <div className="argus-card sleep-timeline-card" style={{ marginBottom: "24px" }}>
      <div className="argus-card-header">
        <div className="argus-card-title-row">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          <span className="argus-card-title">Live Sleep Timeline (ESP32 Staging Engine)</span>
        </div>

        {latest ? (
          <span
            className="argus-chip-small"
            style={{
              borderColor: getStageColor(latest.stage).color,
              color: getStageColor(latest.stage).color,
              background: getStageColor(latest.stage).bg,
              fontWeight: "700",
            }}
          >
            Current Stage: {latest.stage} ({latest.time})
          </span>
        ) : (
          <span className="argus-chip-small muted-chip">Awaiting 5-Min Lock</span>
        )}
      </div>

      {parsed.length === 0 ? (
        <div className="timeline-empty-box" style={{ padding: "20px", textAlign: "center", background: "var(--bg-card-hover)", borderRadius: "14px", border: "1px dashed var(--border-card)" }}>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
            No live sleep session timeline recorded yet. The ESP32 staging engine logs stage transitions after 5 continuous minutes in bed.
          </p>
        </div>
      ) : (
        <div className="timeline-body">
          {/* Visual Timeline Segment Bar */}
          <div className="timeline-segment-bar" style={{ display: "flex", height: "12px", width: "100%", borderRadius: "8px", overflow: "hidden", background: "rgba(148, 163, 184, 0.12)", marginBottom: "16px", gap: "2px" }}>
            {parsed.map((item, idx) => {
              const theme = getStageColor(item.stage);
              return (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    background: theme.color,
                    opacity: 0.85,
                  }}
                  title={`${item.time} — ${item.stage}`}
                />
              );
            })}
          </div>

          {/* Chronological Stage Transition Chips */}
          <div className="timeline-chips-row" style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {parsed.map((item, idx) => {
              const theme = getStageColor(item.stage);
              const isLast = idx === parsed.length - 1;
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 12px",
                    borderRadius: "12px",
                    background: theme.bg,
                    border: `1px solid ${isLast ? theme.color : "transparent"}`,
                    fontSize: "12px",
                  }}
                >
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: "700", color: "var(--text-subtle)" }}>
                    {item.time}
                  </span>
                  <span style={{ fontWeight: "700", color: theme.color }}>
                    {item.stage}
                  </span>
                  {isLast && (
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: theme.color }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
