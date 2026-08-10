# Argus Sleep Monitoring — Web

React + Firebase Realtime Database dashboard. Shows all connected Argus
devices, click one to see its live radar data (updates in real time, no
page refresh needed).

No login/auth — reads directly from Firebase RTDB with public read rules.

## Setup

1. `npm install`
2. Fill in your Firebase web config in `src/firebase.js` (get it from
   Firebase Console → Project settings → General → "Your apps" → Web app).
   This is the public client config — different from the Database Secret
   used by the ESP32 firmware.
3. In Firebase Console → Realtime Database → Rules, set read access (no
   auth required, as requested):
   ```json
   {
     "rules": {
       "devices": {
         ".read": true,
         ".write": false
       }
     }
   }
   ```
   (`.write: false` here since only the ESP32 writes via its own auth —
   the website is read-only.)
4. `npm run dev` for local dev, or `npm run build` to produce `dist/` for
   deployment (Firebase Hosting, Vercel, Netlify, etc. all work).

## Pages

- `/` — device list, reads `/devices`, shows each device's name + online
  status (based on `/info/lastSeen` heartbeat, considered offline after 90s
  of silence).
- `/device/:deviceId` — live dashboard for one device, reads
  `/devices/{deviceId}/live` in real time via Firebase's `onValue` listener.

## Data source

Reads exactly what the Argus ESP32 firmware pushes to
`/devices/{deviceId}/live` and `/devices/{deviceId}/info` — see the
firmware's `Firebase.ino` for the full field list. History is not shown
in this build (live data only).
