import { useState, useEffect } from "react";

/**
 * Extracts a epoch millisecond timestamp from device data (info or live) if present.
 * Supports numbers (seconds/ms), numeric strings, ISO strings, timeStr, and HH:mm:ss strings.
 */
export function getDeviceTimestampMs(info, live) {
  const candidates = [
    live?.timeStr,
    info?.timeStr,
    live?.time,
    live?.timestamp,
    live?.lastSeen,
    live?.ts,
    live?.updatedAt,
    live?.clock,
    info?.lastSeen,
    info?.timestamp,
    info?.time,
    info?.ts,
    info?.updatedAt,
  ];

  for (const val of candidates) {
    if (val === undefined || val === null || val === "") continue;

    // Direct numeric timestamp
    if (typeof val === "number") {
      if (val < 1e11) return val * 1000; // Convert seconds to ms
      return val;
    }

    // String containing digits (epoch string)
    if (typeof val === "string" && !isNaN(val) && val.trim() !== "") {
      const num = Number(val);
      if (num < 1e11) return num * 1000;
      return num;
    }

    // String date/time e.g. "2026-08-10 17:32:05" or ISO string
    if (typeof val === "string") {
      // Replace space with T if format is "YYYY-MM-DD HH:mm:ss"
      const normalizedStr = val.replace(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})$/, "$1T$2");
      const parsed = Date.parse(normalizedStr);
      if (!isNaN(parsed)) return parsed;

      // Handle HH:mm:ss format e.g. "15:17:12" or "03:17:12 PM"
      const timeMatch = val.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
      if (timeMatch) {
        let hrs = parseInt(timeMatch[1], 10);
        const mins = parseInt(timeMatch[2], 10);
        const secs = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
        const ampm = timeMatch[4];
        if (ampm) {
          if (ampm.toUpperCase() === "PM" && hrs < 12) hrs += 12;
          if (ampm.toUpperCase() === "AM" && hrs === 12) hrs = 0;
        }
        const d = new Date();
        d.setHours(hrs, mins, secs, 0);
        return d.getTime();
      }
    }
  }

  return null;
}

/**
 * Format relative elapsed time (e.g. "Just now", "4s ago", "2m ago")
 */
export function formatRelativeTime(timestampMs, nowMs = Date.now()) {
  if (!timestampMs) return null;
  const diffSec = Math.max(0, Math.floor((nowMs - timestampMs) / 1000));

  if (diffSec < 3) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// 15 seconds threshold: Device is marked offline after 15 seconds of silence/no data sent.
export const DEFAULT_ONLINE_THRESHOLD_MS = 15000;

/**
 * Evaluates online status of a device based on Firebase data & reception time.
 */
export function evaluateDeviceStatus({
  info,
  live,
  lastReceivedAt,
  nowMs = Date.now(),
  thresholdMs = DEFAULT_ONLINE_THRESHOLD_MS,
}) {
  const deviceTs = getDeviceTimestampMs(info, live);

  // 1. If we have client-side reception time recorded during active subscription
  if (lastReceivedAt) {
    const elapsedSinceReceive = nowMs - lastReceivedAt;

    if (elapsedSinceReceive <= thresholdMs) {
      return {
        online: true,
        lastSeenMs: lastReceivedAt,
        lastSeenText: formatRelativeTime(lastReceivedAt, nowMs),
        deviceTime: deviceTs ? new Date(deviceTs).toLocaleTimeString() : null,
      };
    }

    // Client hasn't received update in > thresholdMs
    const mostRecentMs = deviceTs ? Math.max(lastReceivedAt, deviceTs) : lastReceivedAt;
    const elapsedDeviceTs = deviceTs ? nowMs - deviceTs : Infinity;

    const isStillOnline = elapsedDeviceTs <= thresholdMs;
    return {
      online: isStillOnline,
      lastSeenMs: mostRecentMs,
      lastSeenText: formatRelativeTime(mostRecentMs, nowMs),
      deviceTime: deviceTs ? new Date(deviceTs).toLocaleTimeString() : null,
    };
  }

  // 2. Initial load before receiving real-time events, fallback to device timestamp
  if (deviceTs) {
    const elapsed = nowMs - deviceTs;
    const isOnline = elapsed <= thresholdMs;
    return {
      online: isOnline,
      lastSeenMs: deviceTs,
      lastSeenText: formatRelativeTime(deviceTs, nowMs),
      deviceTime: new Date(deviceTs).toLocaleTimeString(),
    };
  }

  return {
    online: false,
    lastSeenMs: null,
    lastSeenText: "No data",
    deviceTime: null,
  };
}

/**
 * React hook that triggers a re-render every intervalMs (default 1 second).
 */
export function useTick(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
