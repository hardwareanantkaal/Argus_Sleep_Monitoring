// Argus Sleep Monitoring · config.h — all settings + pin map (plain ESP32, arduino-esp32 core 3.x)
// Sensor-only build: C1001 radar + WiFi + Firebase RTDB push. No lamp/touch/alarm/Matter.
#pragma once

#define DEVICE_BRAND     "Argus Sleep Monitoring"
#define DEVICE_ID        "argus-02"     // fixed device path name used in Firebase (was MAC-based)

// ---------------- WiFi / network ----------------
// No compile-time WiFi credentials — the device keeps a LIST of saved
// networks in NVS instead (see APMODE below), added entirely from the /wifi
// setup page's scan-and-pick flow. Nothing to edit here for WiFi.
// No mDNS/local API in this build — Firebase RTDB is the only data path.
// WIFI_HOSTNAME is cosmetic only (shows up in your router's DHCP client list).
#define WIFI_HOSTNAME  "argus"

// ---------------- APMODE: multi-network WiFi list ----------------
// When no saved network is reachable, the device opens a setup hotspot. Its
// /wifi page SCANS for nearby WiFi and shows a dropdown to pick from — no
// need to type an SSID by hand. Picking one + entering its password adds it
// to the saved list (kept in NVS); up to APMODE_MAX_NETS are tried in order,
// strongest RSSI first, on every (re)connect attempt.
#define APMODE_SSID       "Argus-Setup"
#define APMODE_PASS       "12345678"
#define APMODE_MAX_NETS   5        // how many saved SSID/password pairs to keep

// ---------------- Firebase Realtime Database ----------------
// Fill these in with your Firebase project's values (Project settings ->
// General for the URL, and a Database Secret or a signed-in user's ID token
// for auth — legacy DB Secrets are simplest for a device-only writer).
// REST push path used: {FIREBASE_HOST}/devices/{deviceId}/live.json?auth={FIREBASE_AUTH}
#define FIREBASE_HOST   "argueepmonitoring-default-rtdb.asia-southeast1.firebasedatabase.app"   // no https://, no trailing slash
#define FIREBASE_AUTH   "c0rbKNbEhZYQklHng84ggVS8baE503NKDULScUvK"
#define FIREBASE_PUSH_MS      1000   // push /live every 1 s
#define FIREBASE_INFO_MS     30000   // refresh /info every 30 s (lastSeen heartbeat)
#define FIREBASE_CONFIG_POLL_MS 10000  // check /info/configMode every 10 s (client-writable trigger)

// ---------------- time sync (NTP, for real lastSeen/ts timestamps) ----------------
#define TZ_OFFSET_SEC   19800      // India = GMT+5:30
#define DST_OFFSET_SEC  0
#define NTP_SERVER      "pool.ntp.org"

// ---------------- C1001 radar (UART) ----------------
// Plain ESP32 Dev Module: UART2 pins. Avoid GPIO1/3 (USB serial), GPIO6-11
// (internal flash) and input-only GPIO34-39 for TX.
#define RADAR_RX   16              // ESP32 RX2 <- C1001 TX
#define RADAR_TX   17              // ESP32 TX2 -> C1001 RX

// ---------------- sleep engine (on-device staging) ----------------
// The radar's internal staging needs 15-20+ min before it reports anything;
// this engine stages every minute from movement + vitals, so naps work too.
#define SLEEP_EPOCH_SEC   60   // one staging decision per minute
#define ONSET_QUIET_EP     3   // quiet minutes in bed -> counted as asleep
#define SESSION_CONFIRM_EP 5   // light-or-deep minutes needed before a session
                                // becomes real/visible in history + Firebase
#define SESSION_PUSH_EP    5   // once confirmed, refresh the SAME Firebase
                                // history node every this-many staging epochs
                                // (minutes) — one session, updated in place,
                                // never split into several
#define DEEP_AFTER_EP     10   // very-quiet asleep minutes -> deep sleep
#define QUIET_RANGE        8   // mean movement <= this = quiet minute
#define WAKE_RANGE        14   // mean movement >= this while asleep = awakening
#define BURST_RANGE       30   // single-sample movement spike
#define OOB_END_EP         8   // minutes out of bed/zone -> session auto-ends
#define AUTO_SAVE_MIN     15   // auto-ended sessions saved if in bed >= this
#define MANUAL_SAVE_MIN    1   // "End session" button: explicit press always saves
                               // (>= 1 min). Was 3 — that silently discarded short
                               // test sessions, which looked like "history saves once".

// ---------------- history ----------------
#define HIST_MAX        60     // sessions kept on flash (oldest dropped first)

// ---------------- misc ----------------
#define FW_VERSION      "1.0"
#define POLL_DELAY_MS   120
#define SERIAL_PRINT_MS 2000
