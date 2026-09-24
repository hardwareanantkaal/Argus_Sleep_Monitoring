import { initializeApp } from "firebase/app";
import { getDatabase, ref, get } from "firebase/database";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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
const db = getDatabase(app);
const firestore = getFirestore(app);

const devicesSnap = await get(ref(db, "devices"));
const deviceIds = devicesSnap.exists() ? Object.keys(devicesSnap.val()) : [];
console.log(`Devices in RTDB: ${deviceIds.join(", ")}\n`);

for (const id of deviceIds) {
  let rtdbCount = "?";
  let fsCount = "?";
  try {
    const rtdbHist = await get(ref(db, `devices/${id}/history`));
    rtdbCount = rtdbHist.exists() ? Object.keys(rtdbHist.val()).length : 0;
  } catch (err) {
    rtdbCount = `ERROR: ${err.code || err.message}`;
  }
  try {
    const fsHist = await getDocs(collection(firestore, "deviceHistory", id, "history"));
    fsCount = fsHist.size;
  } catch (err) {
    fsCount = `ERROR: ${err.code || err.message}`;
  }
  console.log(`${id}: RTDB history = ${rtdbCount} node(s), Firestore deviceHistory = ${fsCount} doc(s)`);
}
process.exit(0);
