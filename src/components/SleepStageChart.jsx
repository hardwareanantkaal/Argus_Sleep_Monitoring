import React from "react";
import { parseSleepTimeline } from "../utils/argusEnums.js";

export default function SleepStageChart({ sleepTimeline, title = "Sleep Stage Timeline Graph", hideIfEmpty = true }) {
  const parsed = parseSleepTimeline(sleepTimeline);

  if (parsed.length === 0 && hideIfEmpty) {
    return null;
  }

  const getStageLevel = (stageStr) => {
    const s = (stageStr || "").toLowerCase();
    if (s.includes("awake")) return { label: "Awake", level: 0, y: 25, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.18)" };
    if (s.includes("light") || s.includes("shallow")) return { label: "Light", level: 1, y: 80, color: "#06b6d4", bg: "rgba(6, 182, 212, 0.18)" };
    if (s.includes("deep")) return { label: "Deep", level: 2, y: 135, color: "#818cf8", bg: "rgba(129, 140, 248, 0.18)" };
    return { label: "Awake", level: 0, y: 25, color: "#64748b", bg: "rgba(148, 163, 184, 0.12)" };
  };

  // Calculate Stage Stats
  let deepCount = 0;
  let lightCount = 0;
  let awakeCount = 0;

  parsed.forEach((item) => {
    const meta = getStageLevel(item.stage);
    if (meta.label === "Deep") deepCount++;
    else if (meta.label === "Light") lightCount++;
    else if (meta.label === "Awake") awakeCount++;
  });

  const total = parsed.length || 1;
  const deepPct = Math.round((deepCount / total) * 100);
  const lightPct = Math.round((lightCount / total) * 100);
  const awakePct = Math.round((awakeCount / total) * 100);

  // Generate SVG Hypnogram Step Path
  const width = 880;
  const height = 160;
  const paddingLeft = 70;
  const paddingRight = 30;
  const chartWidth = width - paddingLeft - paddingRight;

  const points = parsed.map((item, index) => {
    const meta = getStageLevel(item.stage);
    const x = paddingLeft + (index / (parsed.length > 1 ? parsed.length - 1 : 1)) * chartWidth;
    return { x, y: meta.y, label: meta.label, color: meta.color, time: item.time, stage: item.stage };
  });

  // Construct step line path (horizontal then vertical steps)
  let pathD = "";
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      pathD += ` H ${curr.x} V ${curr.y}`;
    }
  }

  // Construct gradient area path
  let areaD = "";
  if (points.length > 0) {
    areaD = `${pathD} L ${points[points.length - 1].x} ${height - 10} L ${points[0].x} ${height - 10} Z`;
  }

  return (
    <div className="argus-card hypnogram-chart-card" style={{ padding: "22px" }}>
      <div className="argus-card-header" style={{ marginBottom: "18px" }}>
        <div className="argus-card-title-row">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span className="argus-card-title">{title}</span>
        </div>
        <span className="argus-chip-small cyan-chip">Continuous Hypnogram</span>
      </div>

      {parsed.length === 0 ? (
        <div
          style={{
            padding: "24px",
            textAlign: "center",
            background: "var(--bg-card-hover)",
            borderRadius: "14px",
            border: "1px dashed var(--border-card)",
          }}
        >
          <p style={{ color: "var(--text-muted)", fontSize: "13px", margin: 0 }}>
            No sleep stage timeline entries recorded yet. Line graph renders live as stage transitions occur.
          </p>
        </div>
      ) : (
        <div>
          {/* Stage Quick Breakdown Cards (Easy to find Deep, Light, Awake) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "14px",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                background: "rgba(129, 140, 248, 0.12)",
                border: "1px solid rgba(129, 140, 248, 0.3)",
                padding: "12px 16px",
                borderRadius: "14px",
              }}
            >
              <span style={{ fontSize: "11px", color: "var(--text-subtle)", fontWeight: "600" }}>Deep Sleep</span>
              <div style={{ fontSize: "20px", fontWeight: "800", color: "#818cf8", marginTop: "2px" }}>
                {deepCount} <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "600" }}>({deepPct}%)</span>
              </div>
              <span style={{ fontSize: "11px", color: "var(--text-subtle)" }}>Restorative stage</span>
            </div>

            <div
              style={{
                background: "rgba(6, 182, 212, 0.12)",
                border: "1px solid rgba(6, 182, 212, 0.3)",
                padding: "12px 16px",
                borderRadius: "14px",
              }}
            >
              <span style={{ fontSize: "11px", color: "var(--text-subtle)", fontWeight: "600" }}>Light Sleep</span>
              <div style={{ fontSize: "20px", fontWeight: "800", color: "#06b6d4", marginTop: "2px" }}>
                {lightCount} <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "600" }}>({lightPct}%)</span>
              </div>
              <span style={{ fontSize: "11px", color: "var(--text-subtle)" }}>Shallow rest stage</span>
            </div>

            <div
              style={{
                background: "rgba(245, 158, 11, 0.12)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                padding: "12px 16px",
                borderRadius: "14px",
              }}
            >
              <span style={{ fontSize: "11px", color: "var(--text-subtle)", fontWeight: "600" }}>Awake Periods</span>
              <div style={{ fontSize: "20px", fontWeight: "800", color: "#f59e0b", marginTop: "2px" }}>
                {awakeCount} <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "600" }}>({awakePct}%)</span>
              </div>
              <span style={{ fontSize: "11px", color: "var(--text-subtle)" }}>Awakenings in bed</span>
            </div>
          </div>

          {/* SVG Hypnogram Line Chart */}
          <div
            style={{
              background: "var(--bg-card-hover)",
              padding: "16px",
              borderRadius: "18px",
              border: "1px solid var(--border-card)",
              overflowX: "auto",
            }}
          >
            <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", display: "block" }}>
              <defs>
                <linearGradient id="hypnoGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#818cf8" stopOpacity="0.05" />
                </linearGradient>
              </defs>

              {/* Y-Axis Reference Guide Lines */}
              <g className="hypno-grid">
                <line x1={paddingLeft} y1="25" x2={width - paddingRight} y2="25" stroke="rgba(245, 158, 11, 0.25)" strokeDasharray="4 4" />
                <text x="10" y="29" fill="#f59e0b" fontSize="11" fontWeight="700">Awake</text>

                <line x1={paddingLeft} y1="80" x2={width - paddingRight} y2="80" stroke="rgba(6, 182, 212, 0.25)" strokeDasharray="4 4" />
                <text x="10" y="84" fill="#06b6d4" fontSize="11" fontWeight="700">Light</text>

                <line x1={paddingLeft} y1="135" x2={width - paddingRight} y2="135" stroke="rgba(129, 140, 248, 0.25)" strokeDasharray="4 4" />
                <text x="10" y="139" fill="#818cf8" fontSize="11" fontWeight="700">Deep</text>
              </g>

              {/* Gradient Area below step line */}
              {areaD && <path d={areaD} fill="url(#hypnoGrad)" />}

              {/* Hypnogram Step Line */}
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="var(--cyan-accent)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Transition Nodes / Circles */}
              {points.map((pt, idx) => (
                <g key={idx}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="5"
                    fill={pt.color}
                    stroke="var(--bg-deep)"
                    strokeWidth="2"
                  />
                  {/* Timestamp on X-Axis */}
                  <text
                    x={pt.x}
                    y={height - 2}
                    textAnchor="middle"
                    fill="var(--text-subtle)"
                    fontSize="10"
                    fontFamily="var(--font-mono)"
                  >
                    {pt.time}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
