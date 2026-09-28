import React, { useRef, useState } from "react";
import { parseSleepTimeline } from "../utils/argusEnums.js";
import { parseSessionTimeMs, timeOfDayToMs } from "../utils/deviceHistorySync.js";

function formatHoursMinutes(totalMinutes) {
  const mins = Number(totalMinutes);
  if (isNaN(mins) || mins <= 0) return "0m";
  const hrs = Math.floor(mins / 60);
  const remMins = Math.round(mins % 60);
  if (hrs > 0 && remMins > 0) return `${hrs}h ${remMins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${remMins}m`;
}

function formatFullDateTime(ms) {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SleepStageChart({ sleepTimeline, title = "Sleep Stage Timeline Graph", hideIfEmpty = true, endTime }) {
  const parsed = parseSleepTimeline(sleepTimeline);
  const svgRef = useRef(null);
  const [hoverIdx, setHoverIdx] = useState(null);

  if (parsed.length === 0 && hideIfEmpty) {
    return null;
  }

  const getStageLevel = (stageStr) => {
    const s = (stageStr || "").toLowerCase();
    if (s.includes("awake")) return { label: "Awake", level: 0, y: 30, color: "#f59e0b", bg: "rgba(245, 158, 11, 0.18)" };
    if (s.includes("light") || s.includes("shallow")) return { label: "Light", level: 1, y: 85, color: "#06b6d4", bg: "rgba(6, 182, 212, 0.18)" };
    if (s.includes("deep")) return { label: "Deep", level: 2, y: 140, color: "#818cf8", bg: "rgba(129, 140, 248, 0.18)" };
    return { label: "Awake", level: 0, y: 30, color: "#64748b", bg: "rgba(148, 163, 184, 0.12)" };
  };

  // Calculate Stage Stats. When endTime is given (history view), weight by how
  // long each stage actually lasted; otherwise (live view) fall back to the
  // original per-point count so nothing changes there.
  let deepCount = 0;
  let lightCount = 0;
  let awakeCount = 0;
  const endMs = endTime ? parseSessionTimeMs(endTime) : null;

  if (endMs !== null) {
    for (let i = 0; i < parsed.length; i++) {
      const meta = getStageLevel(parsed[i].stage);
      const startMs = timeOfDayToMs(parsed[i].time, endMs);
      const nextMs = i + 1 < parsed.length ? timeOfDayToMs(parsed[i + 1].time, endMs) : endMs;
      const durMin = startMs !== null && nextMs !== null ? Math.max(0, (nextMs - startMs) / 60000) : 0;
      if (meta.label === "Deep") deepCount += durMin;
      else if (meta.label === "Light") lightCount += durMin;
      else if (meta.label === "Awake") awakeCount += durMin;
    }
    deepCount = Math.round(deepCount);
    lightCount = Math.round(lightCount);
    awakeCount = Math.round(awakeCount);
  } else {
    parsed.forEach((item) => {
      const meta = getStageLevel(item.stage);
      if (meta.label === "Deep") deepCount++;
      else if (meta.label === "Light") lightCount++;
      else if (meta.label === "Awake") awakeCount++;
    });
  }

  const total = deepCount + lightCount + awakeCount || 1;
  const deepPct = Math.round((deepCount / total) * 100);
  const lightPct = Math.round((lightCount / total) * 100);
  const awakePct = Math.round((awakeCount / total) * 100);
  const countUnit = endMs !== null ? "min" : "";

  // Position each point by REAL elapsed time rather than by index, so a 20-min
  // stretch out of a 1-hour session visually takes up ~33% of the line instead
  // of every gap between points looking the same width regardless of duration.
  // Falls back to equal spacing if there's no endTime to anchor against. The
  // chart stays a fixed width (no horizontal scroll) — proportional spacing
  // already fits any normal sleep session's timeline into it.
  const paddingLeft = 70;
  const paddingRight = 40;
  const width = 880;
  const height = 180;
  const chartWidth = width - paddingLeft - paddingRight;

  const pointsMs = endMs !== null ? parsed.map((item) => timeOfDayToMs(item.time, endMs)) : null;
  const firstMs = pointsMs && pointsMs.length ? pointsMs[0] : null;
  const totalSpanMs = firstMs !== null ? endMs - firstMs : null;
  const useProportional = pointsMs && firstMs !== null && totalSpanMs !== null && totalSpanMs > 0 && pointsMs.every((ms) => ms !== null);

  const points = parsed.map((item, index) => {
    const meta = getStageLevel(item.stage);
    const x = useProportional
      ? paddingLeft + ((pointsMs[index] - firstMs) / totalSpanMs) * chartWidth
      : paddingLeft + (parsed.length > 1 ? (index / (parsed.length - 1)) * chartWidth : chartWidth / 2);
    return { x, y: meta.y, label: meta.label, color: meta.color, time: item.time, stage: item.stage, ms: pointsMs ? pointsMs[index] : null };
  });

  // Construct step line path (horizontal then vertical steps), extended to the
  // right edge (session end / "now") so the last stage's line doesn't just stop
  // dead at its own timestamp — it visibly continues until the session did.
  const lineEndX = useProportional ? paddingLeft + chartWidth : (points.length ? points[points.length - 1].x : paddingLeft);
  let pathD = "";
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const curr = points[i];
      pathD += ` H ${curr.x} V ${curr.y}`;
    }
    pathD += ` H ${lineEndX}`;
  }

  // Construct gradient area path
  let areaD = "";
  if (points.length > 0) {
    areaD = `${pathD} L ${lineEndX} ${height - 25} L ${points[0].x} ${height - 25} Z`;
  }

  // Proportional spacing can put several points close together in time (and
  // therefore in x) — decide up front which ones get a visible timestamp label
  // so they don't overlap into unreadable text, without hiding any of the
  // circle markers themselves.
  const MIN_LABEL_GAP_PX = 46; // ~"HH:mm" at this font size, plus a little breathing room
  let lastLabelX = -Infinity;
  const showLabel = points.map((pt) => {
    if (pt.x - lastLabelX < MIN_LABEL_GAP_PX) return false;
    lastLabelX = pt.x;
    return true;
  });

  // Segment ranges (start x -> end x) used to figure out which stage the
  // cursor is currently over, for the hover tooltip below.
  const endTimeLabel = endTime ? (endTime.includes(" ") ? endTime.split(" ")[1].slice(0, 5) : endTime) : null;
  const segments = points.map((pt, i) => {
    const nextX = i + 1 < points.length ? points[i + 1].x : lineEndX;
    const endLabel = i + 1 < points.length ? points[i + 1].time : (endTimeLabel ?? pt.time);
    return { x: pt.x, width: Math.max(0, nextX - pt.x), stage: pt.stage, startLabel: pt.time, endLabel, color: pt.color, ms: pt.ms };
  });

  // Floating tooltip that follows the cursor — snaps to whichever segment the
  // pointer is currently over and shows that segment's date/time + stage.
  const handleMouseMove = (e) => {
    const svg = svgRef.current;
    if (!svg) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const svgP = pt.matrixTransform(ctm.inverse());
    let idx = segments.findIndex((s) => svgP.x >= s.x && svgP.x < s.x + s.width);
    if (idx === -1) {
      if (segments.length && svgP.x >= segments[segments.length - 1].x) idx = segments.length - 1;
      else if (segments.length) idx = 0;
      else idx = -1;
    }
    setHoverIdx(idx >= 0 ? idx : null);
  };
  const handleMouseLeave = () => setHoverIdx(null);

  const hoverSeg = hoverIdx !== null ? segments[hoverIdx] : null;
  const tooltipWidth = 150;
  const tooltipHeight = 46;
  const tooltipX = hoverSeg
    ? Math.max(paddingLeft, Math.min(hoverSeg.x - tooltipWidth / 2, width - paddingRight - tooltipWidth))
    : 0;
  const tooltipY = 4;

  return (
    <div className="argus-card hypnogram-chart-card" style={{ padding: "22px" }}>
      <div className="argus-card-header" style={{ marginBottom: "18px" }}>
        <div className="argus-card-title-row">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span className="argus-card-title">{title}</span>
        </div>
        <span className="argus-chip-small cyan-chip">
          Continuous Hypnogram
        </span>
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
          {/* Stage Quick Breakdown Cards */}
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
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                padding: "12px 16px",
                borderRadius: "14px",
              }}
            >
              <span style={{ fontSize: "11px", color: "var(--text-subtle)", fontWeight: "600" }}>Total Sleep Time</span>
              <div style={{ fontSize: "20px", fontWeight: "800", color: "#10b981", marginTop: "2px" }}>
                {countUnit ? formatHoursMinutes(deepCount + lightCount) : deepCount + lightCount}{" "}
                <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "600" }}>({deepPct + lightPct}%)</span>
              </div>
              <span style={{ fontSize: "11px", color: "var(--text-subtle)" }}>
                {countUnit ? `${deepCount + lightCount} min · ` : ""}Light + Deep combined
              </span>
            </div>

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
                {countUnit ? formatHoursMinutes(deepCount) : deepCount}{" "}
                <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "600" }}>({deepPct}%)</span>
              </div>
              <span style={{ fontSize: "11px", color: "var(--text-subtle)" }}>
                {countUnit ? `${deepCount} min · ` : ""}Restorative stage
              </span>
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
                {countUnit ? formatHoursMinutes(lightCount) : lightCount}{" "}
                <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "600" }}>({lightPct}%)</span>
              </div>
              <span style={{ fontSize: "11px", color: "var(--text-subtle)" }}>
                {countUnit ? `${lightCount} min · ` : ""}Shallow rest stage
              </span>
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
                {countUnit ? formatHoursMinutes(awakeCount) : awakeCount}{" "}
                <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: "600" }}>({awakePct}%)</span>
              </div>
              <span style={{ fontSize: "11px", color: "var(--text-subtle)" }}>
                {countUnit ? `${awakeCount} min · ` : ""}Awakenings in bed
              </span>
            </div>
          </div>

          {/* SVG Hypnogram Line Chart — fixed width, always fits, no horizontal scroll */}
          <div
            style={{
              background: "var(--bg-card-hover)",
              padding: "18px 16px 14px 16px",
              borderRadius: "18px",
              border: "1px solid var(--border-card)",
            }}
          >
            <svg
              ref={svgRef}
              viewBox={`0 0 ${width} ${height}`}
              style={{
                width: "100%",
                height: "auto",
                display: "block",
              }}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <defs>
                <linearGradient id="hypnoGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#818cf8" stopOpacity="0.05" />
                </linearGradient>
              </defs>

              {/* Y-Axis Reference Guide Lines */}
              <g className="hypno-grid">
                <line x1={paddingLeft} y1="30" x2={width - paddingRight} y2="30" stroke="rgba(245, 158, 11, 0.25)" strokeDasharray="4 4" />
                <text x="12" y="34" fill="#f59e0b" fontSize="12" fontWeight="700">Awake</text>

                <line x1={paddingLeft} y1="85" x2={width - paddingRight} y2="85" stroke="rgba(6, 182, 212, 0.25)" strokeDasharray="4 4" />
                <text x="12" y="89" fill="#06b6d4" fontSize="12" fontWeight="700">Light</text>

                <line x1={paddingLeft} y1="140" x2={width - paddingRight} y2="140" stroke="rgba(129, 140, 248, 0.25)" strokeDasharray="4 4" />
                <text x="12" y="144" fill="#818cf8" fontSize="12" fontWeight="700">Deep</text>
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

              {/* Invisible hit area covering the whole plot — mouse position is
                  tracked on the svg itself; this just extends the hoverable
                  region to the full chart height, not just the thin line. */}
              <rect
                x={paddingLeft}
                y="10"
                width={chartWidth}
                height={height - 35}
                fill="transparent"
              />

              {/* Hover guide line + highlighted point */}
              {hoverSeg && (
                <>
                  <line
                    x1={hoverSeg.x}
                    y1="10"
                    x2={hoverSeg.x}
                    y2={height - 25}
                    stroke="rgba(226, 232, 240, 0.35)"
                    strokeDasharray="3 3"
                  />
                  <circle cx={hoverSeg.x} cy={points[hoverIdx].y} r="6.5" fill={hoverSeg.color} stroke="#fff" strokeWidth="2" />
                </>
              )}

              {/* Transition Nodes / Circles & Timestamps */}
              {points.map((pt, idx) => (
                <g key={idx}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="5"
                    fill={pt.color}
                    stroke="var(--bg-deep, #0f172a)"
                    strokeWidth="2"
                  >
                    <title>{`${pt.stage} started ${pt.time}`}</title>
                  </circle>
                  {/* Timestamp on X-Axis — skipped when too close to the previous label */}
                  {showLabel[idx] && (
                    <text
                      x={pt.x}
                      y={height - 5}
                      textAnchor="middle"
                      fill="var(--text-subtle)"
                      fontSize="11"
                      fontFamily="var(--font-mono)"
                      fontWeight="600"
                    >
                      {pt.time}
                    </text>
                  )}
                </g>
              ))}

              {/* Floating tooltip — follows the cursor, snapped to the hovered segment */}
              {hoverSeg && (
                <g transform={`translate(${tooltipX}, ${tooltipY})`} style={{ pointerEvents: "none" }}>
                  <rect
                    width={tooltipWidth}
                    height={tooltipHeight}
                    rx="8"
                    fill="#0f172a"
                    stroke="rgba(255,255,255,0.15)"
                  />
                  <text x="10" y="17" fontSize="10.5" fill="#94a3b8" fontFamily="var(--font-mono)">
                    {hoverSeg.ms !== null ? formatFullDateTime(hoverSeg.ms) : hoverSeg.startLabel}
                  </text>
                  <circle cx="15" cy="32" r="4" fill={hoverSeg.color} />
                  <text x="24" y="35.5" fontSize="12" fontWeight="700" fill="#f8fafc">
                    {hoverSeg.stage} · {hoverSeg.startLabel}–{hoverSeg.endLabel}
                  </text>
                </g>
              )}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
