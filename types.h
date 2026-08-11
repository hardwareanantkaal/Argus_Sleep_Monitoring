// Argus Sleep Monitoring · types.h — shared data model + global declarations
// Pure C1001 radar sensor node: no lamp, no touch button, no alarm, no Matter.
#pragma once
#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include "freertos/FreeRTOS.h"
#include "freertos/semphr.h"
#include "ShubhSensor.h"
#include "config.h"

// All telemetry: C1001 radar only
struct SensorData {
  bool valid = false; uint32_t seq = 0;
  // live human (radar)
  int presence=0, motion=0, movingRange=0, distance=0;
  int heartRate=0, breathRate=0, breathState=4;
  // live sleep (radar)
  int inBed=0, sleepState=3, wakeDur=0, lightDur=0, deepDur=0, quality=0;
  int disturbance=3, rating=0, abnormal=0;
  // composite (radar)
  int cResp=0, cHeart=0, cTurn=0, cLarge=0, cMinor=0, cApnea=0;
  // nightly statistics (radar)
  int sScore=0, sSleepTime=0, sWake=0, sShallow=0, sDeep=0,
      sOOB=0, sExit=0, sTurn=0, sResp=0, sHeart=0, sApnea=0;
};

// On-device sleep-session recording (1 sample/min, ~10 h ring buffer).
// Survives page refreshes — the hypnogram is rebuilt from this, not browser RAM.
#define SESS_MAX 600
struct SessSample { uint8_t stage, hr, br; };

// Live output of the on-device sleep-staging engine (Sleep.ino).
// stage: 0 deep, 1 light, 2 awake-in-bed, 3 no session — same coding as radar.
struct SleepLive {
  bool active = false;
  int  stage = 3;
  int  bedMin=0, sleepMin=0, deepMin=0, lightMin=0, awakeMin=0;
  int  onsetMin=-1, wakes=0, turns=0, score=0;   // score = live estimate
  char since[17] = "0000-00-00 00:00";           // session start, "YYYY-MM-DD HH:MM"
};

struct NightReport {
  bool valid = false;
  char when[20] = "";                            // "YYYY-MM-DD HH:MM" (local flash record only)
  char startTime[17] = "0000-00-00 00:00";       // "YYYY-MM-DD HH:MM" — session start (in bed -> tracking started)
  char endTime[17]   = "0000-00-00 00:00";       // "YYYY-MM-DD HH:MM" — report build time (session end, or latest in-progress refresh)
  int  bedMin=0, sleepMin=0, deepMin=0, lightMin=0, awakeMin=0;
  int  onsetMin=0, wakes=0, turns=0, avgHR=0, avgBR=0, apnea=0, score=0;
};

// ---- globals (defined in argus.ino) ----
extern SensorData              g;
extern WebServer               server;
extern ShubhSensor             hu;
extern SemaphoreHandle_t       mux;
extern volatile bool           g_sensorReset; // web -> sensor task: please reset the radar
extern volatile bool           radarOk;       // sensor task -> world: radar link healthy
extern volatile bool           g_endSession;  // web -> engine: end session, build report
extern volatile bool           g_configMode;  // set true -> device forces AP setup mode
                                               // (WiFi change / OTA) on the next check in loop(),
                                               // even if saved WiFi already works
extern SleepLive               live;          // engine -> world (guarded by mux)
extern NightReport             lastReport;    // most recent saved session (guarded by mux)
extern SessSample              sessBuf[SESS_MAX];
extern int                     sessN, sessStart;

// ---- entry points across the .ino tabs ----
void   sensorTask(void*);     // Sensor.ino
void   storeBegin();          // Store.ino
void   reportSave(NightReport& r);  // Store.ino — stamp + append to history (local flash backup)
void   reportLoadLast();      // Store.ino — restore last report at boot
void   sleepFeed(const SensorData& s, SleepLive& outLive,
                 NightReport& outRep, bool& repReady);  // Sleep.ino
String sleepSessionId();      // Sleep.ino — stable id for the CURRENT session, "" if none confirmed yet
String sleepTimelineJson();   // Sleep.ino — stage-change timeline as JSON object body (no braces), e.g. "12:00":"Light","01:00":"Deep"
bool   sleepSessionDuePush(); // Sleep.ino — true when the running session should refresh Firebase now
void   sleepSessionMarkPushed();  // Sleep.ino — call right after a live-session push succeeds
bool   sleepSessionSnapshot(NightReport& r);  // Sleep.ino — snapshot of the CURRENTLY running session
// Firebase.ino — RTDB push (device -> cloud, no SDK). This is the ONLY data path.
String deviceId();            // fixed DEVICE_ID from config.h
void   firebaseTimeBegin();   // start NTP sync (call once WiFi is connected)
void   firebasePushLive();    // PUT /devices/{id}/live    (call every FIREBASE_PUSH_MS)
void   firebasePushInfo();    // PUT /devices/{id}/info    (call at boot + every FIREBASE_INFO_MS)
void   firebasePollConfigMode();  // GET /devices/{id}/info/configMode (client-writable trigger)
void   firebasePollRecalibrate(); // GET /devices/{id}/info/recalibrate (client-writable trigger)
void   firebasePushHistory(const NightReport& r, const String& sessionId, bool inProgress);
                               // PUT /devices/{id}/history/{sessionId} — same sessionId reused for
                               // the WHOLE session (in-progress refreshes + final save), never a new
                               // node per push. inProgress=true adds a status marker so the website
                               // can tell a live-updating session apart from a finished one.
// Provision.ino — WiFi portal (APMODE scan-and-pick network list), OTA, factory reset
int    wifiNetCount(); String wifiNetSsid(int i);  String wifiNetPass(int i);
bool   wifiConnectAny(uint32_t perNetworkTimeoutMs); // tries every saved network in turn
void   handleWifiPage();      void handleWifiSave();
void   handleUpdatePage();    void handleUpdateDone();  void handleUpdateUpload();
void   handleFactoryReset();