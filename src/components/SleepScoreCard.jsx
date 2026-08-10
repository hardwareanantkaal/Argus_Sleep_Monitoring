import React from "react";

export default function SleepScoreCard({ score, quality }) {
  const displayScore = typeof score === "number" ? score : 60;
  
  // Calculate rating pill text & color
  let ratingText = quality || "Average";
  if (!quality) {
    if (displayScore >= 80) ratingText = "Optimal";
    else if (displayScore >= 65) ratingText = "Good";
    else if (displayScore >= 50) ratingText = "Average";
    else ratingText = "Restless";
  }

  // SVG Gauge calculations (Radius 64, circumference 2 * PI * 64 = 402.12)
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (displayScore / 100) * circumference;

  return (
    <div className="card-box sleep-score-box">
      <div className="card-box-header">
        <span className="card-title-text">SLEEP SCORE</span>
      </div>

      <div className="score-gauge-wrapper">
        <svg className="score-gauge-svg" width="170" height="170" viewBox="0 0 170 170">
          <defs>
            <linearGradient id="scoreArcGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#eab308" />
            </linearGradient>
          </defs>

          {/* Background Ring Track */}
          <circle
            cx="85"
            cy="85"
            r={radius}
            className="gauge-track"
            strokeWidth="16"
            fill="none"
          />

          {/* Score Arc Progress */}
          <circle
            cx="85"
            cy="85"
            r={radius}
            className="gauge-arc"
            strokeWidth="16"
            stroke="url(#scoreArcGradient)"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={progressOffset}
            strokeLinecap="round"
            transform="rotate(-90 85 85)"
          />
        </svg>

        {/* Center Inner Circle */}
        <div className="score-center-circle">
          <span className="score-big-number">{displayScore}</span>
          <span className="score-inner-lbl">LAST SESSION</span>
        </div>
      </div>

      <div className="score-pill-container">
        <div className="score-rating-pill">{ratingText}</div>
      </div>
    </div>
  );
}
