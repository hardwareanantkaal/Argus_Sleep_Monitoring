// Argus Sleep Monitoring — Firebase config.
// Fill these in from your Firebase project (Project settings -> General ->
// "Your apps" -> Web app -> SDK setup and configuration -> Config).
// This is a client-side public config (safe to ship in the bundle) — it is
// NOT the same as the Database Secret used by the ESP32 firmware.
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

import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
