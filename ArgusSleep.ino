/**
 * Argus Sleep Monitoring — contactless sleep sensor node  | arduino-esp32 core 3.1+
 * Plain ESP32 + C1001 mmWave radar ONLY. No lamp, no touch button, no
 * alarm, no Matter, no local data API — Firebase RTDB is the only data path.
 *
 *  Architecture (deliberate):
 *   - setup() brings up WiFi FIRST. The radar is initialised inside
 *     sensorTask (core 0) with retries — a dead/booting radar can NEVER block
 *     WiFi/cloud push. radarOk reports link health live.
 *   - sensorTask owns the UART exclusively (init, recovery, recalibration).
 *   - 1-min sleep-session ring on-device -> local history survives reboots.
 *   - WiFi: a saved LIST of networks (see APMODE in config.h) is tried in
 *     order; if none connect, an AP setup hotspot comes up with a live
 *     scan-and-pick /wifi page (Provision.ino) — this is the ONLY local web
 *     surface left; there is no dashboard, no /api/*, no mDNS hostname.
 *   - Firebase.ino pushes /live every 1s, /info on a heartbeat, and
 *     /history/{sessionId} once per finished sleep session — see config.h
 *     for the FIREBASE_HOST / FIREBASE_AUTH placeholders to fill in.
 *
 *  deviceId = "argus-" + WiFi MAC (colons stripped, uppercase) — unique per
 *  physical unit with zero manual setup, used as the RTDB path segment.
 *
 *  Board: ESP32 Dev Module. Partition: "Default".
 */

#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include "config.h"
#include "types.h"

DNSServer dnsServer;   // captive portal: redirects every DNS query to us while in AP mode

// ---- global definitions (declared extern in types.h) ----
SensorData              g;
WebServer               server(80);   // /wifi setup + captive portal + OTA ONLY
ShubhSensor             hu(&Serial1);
SemaphoreHandle_t       mux;
volatile bool           g_sensorReset = false;
volatile bool           radarOk = false;
volatile bool           g_endSession = false;
volatile bool           g_configMode = false;
SleepLive               live;
NightReport             lastReport;
SessSample              sessBuf[SESS_MAX];
int                     sessN = 0, sessStart = 0;

// while in AP setup mode, any unknown URL redirects to the config page
// (captive portal behaviour) instead of a 404. Outside AP mode this server
// only exists for a future /wifi visit, so a plain 404 is fine.
void handleCaptiveNotFound() {
  if (WiFi.getMode() & WIFI_MODE_AP) {
    server.sendHeader("Location", "/wifi", true);
    server.send(302, "text/plain", "");
  } else {
    server.send(404, "text/plain", "Not found");
  }
}

static void printTelemetry() {
  SensorData d; SleepLive lv; NightReport R;
  xSemaphoreTake(mux, portMAX_DELAY);
  d=g; lv=live; R=lastReport;
  xSemaphoreGive(mux);
  const char* kState[] = {"Deep","Light","Awake","None"};
  const char* kMot[]   = {"None","Still","Active"};
  Serial.println("------------------------------------------------");
  Serial.printf("radar:%s  presence:%d  bed:%s  radarState:%s  motion:%s  range:%d\n",
                radarOk?"OK":"DOWN", d.presence, d.inBed?"in":"out",
                kState[d.sleepState&3], kMot[d.motion>2?0:d.motion], d.movingRange);
  Serial.printf("HR:%d bpm  resp:%d rpm  breathState:%d\n",
                d.heartRate, d.breathRate, d.breathState);
  Serial.printf("SLEEP[engine] %s  stage:%s  since:%s  bed:%dm asleep:%dm (deep %d/light %d/awake %d)\n",
                lv.active?"SESSION":"idle", kState[lv.stage&3], lv.since,
                lv.bedMin, lv.sleepMin, lv.deepMin, lv.lightMin, lv.awakeMin);
  Serial.printf("SLEEP[engine] onset:%dm  wakes:%d  turns:%d  liveScore:%d   lastReport:%s score:%d   heap:%lu\n",
                lv.onsetMin, lv.wakes, lv.turns, lv.score,
                R.valid?R.when:"none", R.score, (unsigned long)ESP.getFreeHeap());
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n===== " DEVICE_BRAND " booting =====");

  // Radar UART: big RX buffer so proactive radar frames never overflow while
  // we're busy handling WiFi/Firebase. Init itself happens inside sensorTask.
  Serial1.setRxBufferSize(1024);
  Serial1.begin(115200, SERIAL_8N1, RADAR_RX, RADAR_TX);
  Serial.println("[C1001] init runs in background (radar needs ~10-15 s after power-on)");

  storeBegin();

  WiFi.mode(WIFI_STA); WiFi.setSleep(false); WiFi.setHostname(WIFI_HOSTNAME);
  WiFi.setAutoReconnect(true);
  Serial.printf("[Argus] deviceId: %s\n", deviceId().c_str());

  // APMODE network list: try every saved SSID/password (strongest signal
  // first) before giving up and opening the setup hotspot.
  if (!wifiConnectAny(15000)) {
    WiFi.mode(WIFI_AP); WiFi.softAP(APMODE_SSID, APMODE_PASS);
    dnsServer.start(53, "*", WiFi.softAPIP());   // captive portal: any domain -> us
    Serial.printf("[WiFi] no saved network reachable — AP fallback \"%s\" IP: %s\n",
                  APMODE_SSID, WiFi.softAPIP().toString().c_str());
    Serial.println("[WiFi] join the hotspot — setup page opens automatically (captive portal)");
  } else {
    firebaseTimeBegin();   // NTP sync, so lastSeen/ts are real epoch time
  }

  mux = xSemaphoreCreateMutex();
  // /wifi setup portal + OTA firmware update — the only local web surface left
  server.on("/wifi",   HTTP_GET,  handleWifiPage);
  server.on("/wifi",   HTTP_POST, handleWifiSave);
  server.on("/update", HTTP_GET,  handleUpdatePage);
  server.on("/update", HTTP_POST, handleUpdateDone, handleUpdateUpload);
  server.on("/api/reset", handleFactoryReset);
  // captive-portal probe URLs (phones/laptops hit these to detect a portal
  // and auto-pop the browser) — all answered with the setup page
  server.on("/generate_204",      handleWifiPage);  // Android
  server.on("/gen_204",           handleWifiPage);  // Android
  server.on("/hotspot-detect.html", handleWifiPage); // Apple
  server.on("/library/test/success.html", handleWifiPage); // Apple
  server.on("/ncsi.txt",          handleWifiPage);  // Windows
  server.on("/connecttest.txt",   handleWifiPage);  // Windows
  server.onNotFound(handleCaptiveNotFound);         // any other URL while in AP mode
  server.begin();
  Serial.println("[HTTP] /wifi setup portal up");

  if (WiFi.status() == WL_CONNECTED) firebasePushInfo();  // announce ourselves right away

  xTaskCreatePinnedToCore(sensorTask, "radar", 8192, nullptr, 2, nullptr, 0);
  Serial.println("[TASKS] radar(core0) started");
}

void loop() {
  if (WiFi.getMode() & WIFI_MODE_AP) dnsServer.processNextRequest();  // captive portal DNS
  server.handleClient();
  static uint32_t tPrint = 0, tWifi = 0, tFbLive = 0, tFbInfo = 0, tFbPoll = 0;
  uint32_t now = millis();

  // ---- config mode trigger: forces the AP setup hotspot on demand ----
  // Set g_configMode = true from anywhere (radar task, a future button, a
  // Firebase-polled flag, etc.) to re-open /wifi + /update even while the
  // device is already happily connected to home WiFi — useful for changing
  // WiFi networks or flashing new firmware without needing to break the
  // existing connection first.
  if (g_configMode) {
    g_configMode = false;
    if (!(WiFi.getMode() & WIFI_MODE_AP)) {
      WiFi.mode(WIFI_AP_STA);           // AP_STA so it can still keep pushing Firebase
      WiFi.softAP(APMODE_SSID, APMODE_PASS);
      dnsServer.start(53, "*", WiFi.softAPIP());
      Serial.printf("[Config] forced AP setup mode — hotspot \"%s\" IP: %s\n",
                    APMODE_SSID, WiFi.softAPIP().toString().c_str());
      Serial.println("[Config] /wifi (change network) and /update (OTA) are live");
    } else {
      Serial.println("[Config] already in AP setup mode");
    }
  }

  // (history writes happen inside the engine at session end — no polling store)
  if (now - tPrint > SERIAL_PRINT_MS) { tPrint = now; printTelemetry(); }

  // Firebase pushes — paused entirely while the AP setup hotspot is up
  // (WIFI_AP or WIFI_AP_STA/config mode). These are BLOCKING HTTPS calls
  // (TLS handshake + request), and running them every 1s while someone is
  // using /wifi or /update would stall server.handleClient() for as long as
  // each call takes, making the whole config UI feel slow/unresponsive.
  // Setup priority is a snappy UI, not live telemetry — pushes resume the
  // moment AP mode closes.
  if (WiFi.status() == WL_CONNECTED && !(WiFi.getMode() & WIFI_MODE_AP)) {
    if (now - tFbLive > FIREBASE_PUSH_MS) { tFbLive = now; firebasePushLive(); }
    if (now - tFbInfo > FIREBASE_INFO_MS) { tFbInfo = now; firebasePushInfo(); }
    if (now - tFbPoll > FIREBASE_CONFIG_POLL_MS) {
      tFbPoll = now;
      firebasePollConfigMode();
      firebasePollRecalibrate();
    }
  }

  if (now - tWifi > 10000) {                      // auto-recover dropped WiFi
    tWifi = now;
    if (WiFi.getMode() == WIFI_STA && WiFi.status() != WL_CONNECTED) {
      Serial.println("[WiFi] reconnecting...");
      WiFi.reconnect();
    }
  }
  // AP fallback: keep the setup hotspot up, but quietly retry home WiFi every
  // 5 min — a router that was down at boot no longer strands the device in AP
  // mode until someone power-cycles it. This auto-close only applies to the
  // NO-WIFI fallback case (pure WIFI_AP) — a deliberately forced config mode
  // (WIFI_AP_STA, already connected, see g_configMode above) stays open until
  // you leave /wifi's "Save & Reboot" or /update, so triggering config mode
  // while already on home WiFi doesn't snap shut instantly.
  static uint32_t tSta = 0;
  if (WiFi.getMode() == WIFI_AP) {
    if (WiFi.status() == WL_CONNECTED) {
      Serial.printf("[WiFi] home WiFi joined, IP %s — closing setup hotspot\n",
                    WiFi.localIP().toString().c_str());
      dnsServer.stop();
      WiFi.mode(WIFI_STA);
      firebaseTimeBegin();
      firebasePushInfo();
    } else if (now - tSta > 300000UL) {
      tSta = now;
      Serial.println("[WiFi] AP mode: retrying saved networks in background");
      WiFi.mode(WIFI_AP_STA);
      wifiConnectAny(6000);
    }
  }
  delay(1);
}
