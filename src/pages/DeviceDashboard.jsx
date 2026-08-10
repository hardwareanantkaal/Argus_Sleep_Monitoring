import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { db } from "../firebase.js";
import { ref, onValue } from "firebase/database";
import StatCard from "../components/StatCard.jsx";

const SLEEP_STATE = ["Deep", "Light", "Awake", "No session"];
const MOTION_STATE = ["None", "Still", "Active"];

export default function DeviceDashboard() {
  const { deviceId } = useParams();
  const [info, setInfo] = useState(null);
  const [live, setLive] = useState(null);

  useEffect(() => {
    const infoRef = ref(db, `devices/${deviceId}/info`);
    const liveRef = ref(db, `devices/${deviceId}/live`);
    const unsubInfo = onValue(infoRef, (snap) => setInfo(snap.val()));
    const unsubLive = onValue(liveRef, (snap) => setLive(snap.val()));
    return () => {
      unsubInfo();
      unsubLive();
    };
  }, [deviceId]);

  const nowSec = Math.floor(Date.now() / 1000);
  const online =
    info && typeof info.lastSeen === "number" && nowSec - info.lastSeen < 90;

  return (
    <div className="page">
      <header className="page-header">
        <Link to="/" className="back-link">
          &larr; All devices
        </Link>
        <h1>{info?.deviceName || "Argus Sleep Monitoring"}</h1>
        <p className="subtitle">
          {deviceId} &middot;{" "}
          <span className={online ? "status-online-text" : "status-offline-text"}>
            {online ? "Online" : "Offline"}
          </span>
        </p>
      </header>

      {!live && <p className="muted">Waiting for live data…</p>}

      {live && (
        <>
          <section className="stat-grid">
            <StatCard label="Presence" value={live.presence ? "Detected" : "None"} />
            <StatCard
              label="Motion"
              value={MOTION_STATE[live.motion] ?? "—"}
            />
            <StatCard label="Distance" value={`${live.distance ?? "—"} cm`} />
            <StatCard label="Heart rate" value={`${live.heartRate ?? "—"} bpm`} />
            <StatCard label="Breath rate" value={`${live.breathRate ?? "—"} rpm`} />
            <StatCard label="In bed" value={live.inBed ? "Yes" : "No"} />
            <StatCard
              label="Sleep state"
              value={SLEEP_STATE[live.sleepState] ?? "—"}
            />
            <StatCard label="Quality" value={live.quality ?? "—"} />
          </section>

          <section className="stat-section">
            <h2>Composite (rolling averages)</h2>
            <div className="stat-grid">
              <StatCard label="Avg respiration" value={live.cResp ?? "—"} />
              <StatCard label="Avg heartbeat" value={live.cHeart ?? "—"} />
              <StatCard label="Turnovers" value={live.cTurn ?? "—"} />
              <StatCard label="Large movement" value={live.cLarge ?? "—"} />
              <StatCard label="Minor movement" value={live.cMinor ?? "—"} />
              <StatCard label="Apnea events" value={live.cApnea ?? "—"} />
            </div>
          </section>

          <section className="stat-section">
            <h2>Nightly statistics</h2>
            <div className="stat-grid">
              <StatCard label="Sleep score" value={live.sScore ?? "—"} />
              <StatCard label="Sleep time" value={`${live.sSleepTime ?? "—"} min`} />
              <StatCard label="Deep %" value={live.sDeep ?? "—"} />
              <StatCard label="Shallow %" value={live.sShallow ?? "—"} />
              <StatCard label="Out of bed" value={`${live.sOOB ?? "—"} min`} />
              <StatCard label="Exits" value={live.sExit ?? "—"} />
            </div>
          </section>

          <footer className="footer-meta">
            <span>Radar link: {live.radarOk ? "OK" : "Down"}</span>
            <span>Seq: {live.seq ?? "—"}</span>
            {info?.rssi !== undefined && <span>Signal: {info.rssi} dBm</span>}
            {info?.ip && <span>IP: {info.ip}</span>}
          </footer>
        </>
      )}
    </div>
  );
}
