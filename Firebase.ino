// Argus Sleep Monitoring · Firebase.ino — pushes radar data to Firebase
// Realtime Database over plain HTTPS REST (no Firebase SDK — lighter, and
// works fine for a one-way device -> DB writer).
//
// Structure written:
//   /devices/{deviceId}/info   <- identity + connectivity (fw, ip, rssi, timeStr), ~30s
//     /info/configMode          <- CLIENT-WRITABLE: website sets true to force
//                                  the device into AP setup mode remotely
//                                  (see firebasePollConfigMode below)
//     /info/recalibrate         <- CLIENT-WRITABLE: website sets true to force
//                                  a radar recalibration remotely (LED off/on
//                                  + sensor reset, see firebasePollRecalibrate)
//   /devices/{deviceId}/live   <- live radar snapshot, overwritten every 1s
//     /live/composite          <- C1001's short-term rolling stats (cResp, cHeart, ...)
//     /live/nightly            <- C1001's overnight statistics block (sScore, sSleepTime, ...)
//   /devices/{deviceId}/history/{sessionId} <- one node per finished session
//
// deviceId = fixed DEVICE_ID from config.h (was MAC-based; simplified to a
// single default name, no more per-unit auto-generation).
#include "types.h"
#include "config.h"
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <time.h>

static bool   g_timeSynced = false;

// call once WiFi is connected — starts NTP sync (non-blocking after the first
// call; configTime() kicks off SNTP in the background)
void firebaseTimeBegin() {
  configTime(TZ_OFFSET_SEC, DST_OFFSET_SEC, NTP_SERVER);
}

// real unix epoch seconds once NTP has synced, else 0 (caller can fall back)
static uint32_t nowEpoch() {
  time_t t = time(nullptr);
  if (t > 1700000000) { g_timeSynced = true; return (uint32_t)t; }  // sane post-2023 time = synced
  return 0;
}

// human-readable "YYYY-MM-DD HH:MM:SS" (local time, per TZ_OFFSET_SEC in
// config.h), or "" if NTP hasn't synced yet. This is separate from the epoch
// fields (lastSeen/ts) so the Firebase console shows a readable time without
// any conversion on the website side.
static String nowTimeStr() {
  time_t t = time(nullptr);
  if (t < 1700000000) return "";           // not synced yet
  struct tm tmInfo;
  localtime_r(&t, &tmInfo);
  char buf[20];
  snprintf(buf, sizeof(buf), "%04d-%02d-%02d %02d:%02d:%02d",
           tmInfo.tm_year + 1900, tmInfo.tm_mon + 1, tmInfo.tm_mday,
           tmInfo.tm_hour, tmInfo.tm_min, tmInfo.tm_sec);
  return String(buf);
}

// fixed device path name (see DEVICE_ID in config.h)
String deviceId() {
  return String(DEVICE_ID);
}

// generic PUT of a JSON body to a RTDB path (path WITHOUT leading slash, e.g. "live").
// PUT REPLACES the entire node at that path — fine for /live and /history
// since the device is the only writer there.
static bool fbPut(const String& path, const String& json) {
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClientSecure client;
  client.setInsecure();          // RTDB uses a well-known public CA; skip pinning for simplicity
  HTTPClient http;

  String url = String("https://" FIREBASE_HOST "/devices/") + deviceId() + "/" + path + ".json?auth=" FIREBASE_AUTH;
  if (!http.begin(client, url)) return false;
  http.addHeader("Content-Type", "application/json");

  int code = http.PUT(json);
  bool ok = (code == 200);
  if (!ok) Serial.printf("[Firebase] PUT %s failed, HTTP %d\n", path.c_str(), code);
  http.end();
  return ok;
}

// generic PATCH ("shallow merge") of a JSON body to a RTDB path — only the
// fields present in json are written; anything else already at that path
// (e.g. a client-written flag) is left untouched. Used for /info because
// configMode lives inside the same node and must NOT be clobbered by the
// device's own periodic identity push.
static bool fbPatch(const String& path, const String& json) {
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  String url = String("https://" FIREBASE_HOST "/devices/") + deviceId() + "/" + path + ".json?auth=" FIREBASE_AUTH;
  if (!http.begin(client, url)) return false;
  http.addHeader("Content-Type", "application/json");

  int code = http.PATCH(json);
  bool ok = (code == 200);
  if (!ok) Serial.printf("[Firebase] PATCH %s failed, HTTP %d\n", path.c_str(), code);
  http.end();
  return ok;
}

// generic GET of a RTDB path, returns the raw JSON body ("" on any failure —
// including a genuinely-null Firebase value, which also serializes to "null"
// / empty, so callers should treat "" and "null" the same as "not set").
static String fbGet(const String& path) {
  if (WiFi.status() != WL_CONNECTED) return "";

  WiFiClientSecure client;
  client.setInsecure();
  HTTPClient http;

  String url = String("https://" FIREBASE_HOST "/devices/") + deviceId() + "/" + path + ".json?auth=" FIREBASE_AUTH;
  if (!http.begin(client, url)) return "";

  int code = http.GET();
  String body = (code == 200) ? http.getString() : "";
  if (code != 200) Serial.printf("[Firebase] GET %s failed, HTTP %d\n", path.c_str(), code);
  http.end();
  return body;
}

// /devices/{id}/live -> live radar snapshot (call every FIREBASE_PUSH_MS).
// Base fields are the instant reading; "composite" and "nightly" are nested
// objects so Firebase shows them as separate child nodes under /live —
// /live/composite (C1001 short-term rolling stats) and /live/nightly
// (C1001 overnight statistics block). One PUT writes all three at once, so
// there's no risk of one push wiping out the others.
void firebasePushLive() {
  SensorData d;
  bool rOk;
  xSemaphoreTake(mux, portMAX_DELAY);
  d = g; rOk = radarOk;
  xSemaphoreGive(mux);

  static char b[1000];
  snprintf(b, sizeof(b),
    "{\"radarOk\":%d,\"valid\":%d,"
    "\"presence\":%d,\"motion\":%d,\"movingRange\":%d,\"distance\":%d,"
    "\"heartRate\":%d,\"breathRate\":%d,\"breathState\":%d,"
    "\"inBed\":%d,\"sleepState\":%d,\"quality\":%d,"
    "\"disturbance\":%d,\"rating\":%d,\"abnormal\":%d,"
    "\"composite\":{\"cResp\":%d,\"cHeart\":%d,\"cTurn\":%d,\"cLarge\":%d,\"cMinor\":%d,\"cApnea\":%d},"
    "\"nightly\":{\"sScore\":%d,\"sSleepTime\":%d,\"sWake\":%d,\"sShallow\":%d,\"sDeep\":%d,"
    "\"sOOB\":%d,\"sExit\":%d,\"sTurn\":%d,\"sResp\":%d,\"sHeart\":%d,\"sApnea\":%d}}",
    rOk?1:0, d.valid?1:0,
    d.presence, d.motion, d.movingRange, d.distance,
    d.heartRate, d.breathRate, d.breathState,
    d.inBed, d.sleepState, d.quality,
    d.disturbance, d.rating, d.abnormal,
    d.cResp, d.cHeart, d.cTurn, d.cLarge, d.cMinor, d.cApnea,
    d.sScore, d.sSleepTime, d.sWake, d.sShallow, d.sDeep,
    d.sOOB, d.sExit, d.sTurn, d.sResp, d.sHeart, d.sApnea);
  fbPut("live", String(b));
}

// /devices/{id}/info -> identity + connectivity (call at boot + every FIREBASE_INFO_MS).
// Uses PATCH, not PUT — this node also holds "configMode", a flag the WEBSITE
// writes directly (client-side writable) to remotely trigger AP setup mode.
// PATCH only touches the fields listed here, so the device's own heartbeat
// push can never accidentally overwrite a pending configMode request.
void firebasePushInfo() {
  String ip = (WiFi.getMode() & WIFI_MODE_AP) ? WiFi.softAPIP().toString() : WiFi.localIP().toString();
  String timeStr = nowTimeStr();
  static char b[300];
  snprintf(b, sizeof(b),
    "{\"deviceId\":\"%s\",\"fw\":\"" FW_VERSION "\","
    "\"ip\":\"%s\",\"rssi\":%d,\"timeStr\":\"%s\"}",
    deviceId().c_str(), ip.c_str(), (int)WiFi.RSSI(), timeStr.c_str());
  fbPatch("info", String(b));
}

// checks /devices/{id}/info/configMode (client-side writable — the website
// can set this to true directly). If true: sets the local g_configMode flag
// so argus.ino's loop() forces AP setup mode, then immediately PATCHes it
// back to false in Firebase so it doesn't keep re-triggering on every poll.
// Call this periodically from loop() (a few times a minute is plenty).
//
// Tolerant to how "true" was actually stored: Firebase RTDB returns a raw
// boolean as `true` (no quotes) but a STRING value as `"true"` (with
// quotes) — if the field was set by hand in the console as a string instead
// of a boolean, a strict body=="true" check would silently never match.
// Strip quotes and lowercase before comparing so either form works.
void firebasePollConfigMode() {
  String body = fbGet("info/configMode");
  String raw = body;                      // keep for debug logging
  body.trim();
  body.replace("\"", "");                 // "true" -> true, tolerate string-typed values
  body.toLowerCase();
  Serial.printf("[Firebase] configMode poll -> raw:\"%s\"\n", raw.c_str());
  if (body == "true") {
    Serial.println("[Firebase] configMode=true received — forcing AP setup mode");
    g_configMode = true;
    fbPatch("info", "{\"configMode\":false}");   // consume the flag
  }
}

// checks /devices/{id}/info/recalibrate (client-side writable — same pattern
// as configMode). If true: sets g_sensorReset so sensorTask (Sensor.ino)
// does an LED off/on + radar reset on its next pass, then resets the flag
// back to false in Firebase so it doesn't keep re-triggering.
// Same string/boolean tolerance as firebasePollConfigMode above.
void firebasePollRecalibrate() {
  String body = fbGet("info/recalibrate");
  String raw = body;
  body.trim();
  body.replace("\"", "");
  body.toLowerCase();
  Serial.printf("[Firebase] recalibrate poll -> raw:\"%s\"\n", raw.c_str());
  if (body == "true") {
    Serial.println("[Firebase] recalibrate=true received — triggering sensor recalibration");
    g_sensorReset = true;
    fbPatch("info", "{\"recalibrate\":false}");   // consume the flag
  }
}

// /devices/{id}/history/{sessionId} -> one finished night's report.
// sessionId is the report's own timestamp string with non-alnum chars
// stripped, so it sorts and is safe as an RTDB key.
void firebasePushHistory(const NightReport& r) {
  if (!r.valid) return;
  String sid; sid.reserve(20);
  for (const char* p = r.when; *p; p++) if (isalnum((unsigned char)*p)) sid += *p;
  if (!sid.length()) sid = String((unsigned long)(millis()/1000));

  int deepPct  = r.sleepMin ? r.deepMin  * 100 / r.sleepMin : 0;
  int lightPct = r.sleepMin ? r.lightMin * 100 / r.sleepMin : 0;

  static char b[400];
  snprintf(b, sizeof(b),
    "{\"when\":\"%s\",\"bedMin\":%d,\"sleepMin\":%d,\"deepMin\":%d,\"lightMin\":%d,"
    "\"awakeMin\":%d,\"deepPct\":%d,\"lightPct\":%d,\"onsetMin\":%d,\"wakes\":%d,"
    "\"turns\":%d,\"avgHR\":%d,\"avgBR\":%d,\"apnea\":%d,\"score\":%d}",
    r.when, r.bedMin, r.sleepMin, r.deepMin, r.lightMin,
    r.awakeMin, deepPct, lightPct, r.onsetMin, r.wakes,
    r.turns, r.avgHR, r.avgBR, r.apnea, r.score);
  fbPut(String("history/") + sid, String(b));
}
