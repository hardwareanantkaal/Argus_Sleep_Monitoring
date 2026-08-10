import React from "react";

export default function SleepScoreGauge({ score, quality }) {
  const numScore = typeof score === "number" ? Math.min(100, Math.max(0, score)) : null;

  // Calculate SVG stroke offset for gauge (radius 54, circumference 2 * PI * 54 = 339.29)
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = numScore !== null ? circumference - (numScore / 100) * circumference : circumference;

  let scoreColor = "#64748b"; // default slate
  let scoreTier = "No Data";

  if (numScore !== null) {
    if (numScore >= 85) {
      scoreColor = "#38bdf8"; // Cyan
      scoreTier = "Excellent Rest";
    } else if (numScore >= 70) {
      scoreColor = "#4ade80"; // Green
      scoreTier = "Good Rest";
    } else if (numScore >= 50) {
      scoreColor = "#fbbf24"; // Amber
      scoreTier = "Moderate";
    } else {
      scoreColor = "#f87171"; // Red
      scoreTier = "Restless";
    }
  }

  return (
    <div className="sleep-score-card">
      <div className="score-card-header">
        <span className="score-card-title">Nightly Sleep Score</span>
        <span className="score-quality-tag" style={{ borderColor: scoreColor, color: scoreColor }}>
          {quality !== undefined && quality !== null ? `Quality: ${quality}` : scoreTier}
        </span>
      </div>

      <div className="gauge-container">
        <svg className="gauge-svg" width="140" height="140" viewBox="0 0 140 140">
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>
          </defs>

          {/* Background track circle */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            className="gauge-bg"
            strokeWidth="10"
            fill="transparent"
          />

          {/* Progress circle */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            className="gauge-progress"
            strokeWidth="10"
            stroke="url(#scoreGradient)"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 70 70)"
          />
        </svg>

        <div className="gauge-text">
          <span className="score-number">{numScore !== null ? numScore : "—"}</span>
          <span className="score-max">/ 100</span>
        </div>
      </div>

      <div className="score-footer">
        <div className="score-insight">
          {numScore !== null
            ? `Overall sleep efficiency is rated ${scoreTier.toLowerCase()}.`
            : "Awaiting sleep session metrics."}
        </div>
      </div>
    </div>
  );
}
