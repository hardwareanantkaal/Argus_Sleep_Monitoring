import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCdNvdM2SyvBBZPGXz7SEEiA-g6IPb1DtI",
  authDomain: "argueepmonitoring.firebaseapp.com",
  databaseURL: "https://argueepmonitoring-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "argueepmonitoring",
  storageBucket: "argueepmonitoring.firebasestorage.app",
  messagingSenderId: "90771596724",
  appId: "1:90771596724:web:24de9a792501e623753ee1",
  measurementId: "G-0V5ME0XBX7",
};
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

function toMin(t) {
  const time = t.includes(" ") ? t.split(" ")[1] : t;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function runLengthEncode(entries, endMin) {
  const segs = [];
  for (let i = 0; i < entries.length; i++) {
    const [t, stage] = entries[i];
    const startMin = toMin(t);
    const nextMin = i + 1 < entries.length ? toMin(entries[i + 1][0]) : endMin;
    if (segs.length && segs[segs.length - 1].stage === stage) {
      segs[segs.length - 1].end = nextMin;
    } else {
      segs.push({ stage, start: startMin, end: nextMin });
    }
  }
  return segs.map((s) => ({ ...s, dur: s.end - s.start }));
}

function smooth(segs, thresholdMin) {
  let list = segs.map((s) => ({ ...s }));
  let changed = true;
  while (changed && list.length > 1) {
    changed = false;
    for (let i = 0; i < list.length; i++) {
      if (list[i].dur >= thresholdMin) continue;
      const prev = list[i - 1];
      const next = list[i + 1];
      let mergeInto;
      if (!prev) mergeInto = "next";
      else if (!next) mergeInto = "prev";
      else mergeInto = prev.dur >= next.dur ? "prev" : "next";

      if (mergeInto === "prev") {
        prev.end = list[i].end;
        prev.dur = prev.end - prev.start;
      } else {
        next.start = list[i].start;
        next.dur = next.end - next.start;
      }
      list.splice(i, 1);
      changed = true;
      break;
    }
    for (let i = list.length - 1; i > 0; i--) {
      if (list[i].stage === list[i - 1].stage) {
        list[i - 1].end = list[i].end;
        list[i - 1].dur = list[i - 1].end - list[i - 1].start;
        list.splice(i, 1);
        changed = true;
      }
    }
  }
  return list;
}

function summarize(segs, label) {
  const total = segs.reduce((a, s) => a + s.dur, 0);
  const deep = segs.filter((s) => s.stage === "Deep").reduce((a, s) => a + s.dur, 0);
  const light = total - deep;
  console.log(`\n--- ${label} ---`);
  console.log(`${segs.length} segments, Deep=${deep}min (${Math.round((deep / total) * 100)}%), Light=${light}min (${Math.round((light / total) * 100)}%)`);
  segs.forEach((s) => console.log(`  ${s.stage}: ${s.dur}min`));
}

const snap = await getDoc(doc(firestore, "deviceHistory", "441D64F3B2CC", "history", "s1789976806"));
const data = snap.data();
const entries = Object.entries(data.sleepTimeline || {}).sort((a, b) => a[0].localeCompare(b[0]));
const totalMin = toMin(data.endTime) - toMin(data.startTime);
console.log(`Session: ${data.startTime} -> ${data.endTime} (${totalMin} min total)`);
console.log(`Device-reported: deepMin=${data.deepMin} lightMin=${data.lightMin} deepPct=${data.deepPct} lightPct=${data.lightPct}`);

const raw = runLengthEncode(entries, toMin(data.endTime));
summarize(raw, "RAW (no smoothing)");

for (const pct of [5, 10, 15]) {
  const thresholdMin = totalMin * (pct / 100);
  const smoothed = smooth(raw, thresholdMin);
  summarize(smoothed, `${pct}% threshold (${Math.round(thresholdMin)} min cutoff)`);
}

process.exit(0);
