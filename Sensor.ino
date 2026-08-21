// Argus Sleep Monitoring · Sensor.ino — C1001 radar task (core 0)
// Owns the UART completely: init (non-blocking for the rest of the system),
// link-health watchdog with auto-recovery, validated + smoothed reads,
// and on-device sleep-session recording (1 sample/min ring).
#include "types.h"
#include "config.h"

// keep a value only if it falls in a sane range, else hold the previous one
static inline void upd(int &dst, int v, int lo, int hi) { if (v >= lo && v <= hi) dst = v; }

// rolling-average filter for vitals (drops corrupt/out-of-range, steadies the number)
struct Smoother {
  int buf[6]; int n = 0, idx = 0, miss = 0;
  void push(int v) { buf[idx] = v; idx = (idx + 1) % 6; if (n < 6) n++; miss = 0; }
  void noData()    { if (++miss >= 4) { n = 0; idx = 0; } }     // clear after 4 bad cycles
  void reset()     { n = 0; idx = 0; miss = 0; }
  int  value()     { if (!n) return 0; long s = 0; for (int i = 0; i < n; i++) s += buf[i]; return (int)(s / n); }
};
static Smoother hrSm, brSm;

// NEW: smoother for the HR baseline itself (fed from hrSm.value(), not raw
// epHR) so hrBase locks onto a steadier number instead of chasing one noisy
// epoch mean. See sensorTask()'s baseline-learning block below.
struct HrBaseSmoother {
  int buf[4]; int n = 0, idx = 0;
  void push(int v) { buf[idx] = v; idx = (idx + 1) % 4; if (n < 4) n++; }
  void reset() { n = 0; idx = 0; }
  int  value() { if (!n) return 0; long s = 0; for (int i = 0; i < n; i++) s += buf[i]; return (int)(s / n); }
};
static HrBaseSmoother hrBaseSm;

// ---------------- init (runs inside this task; never blocks WiFi/web) ----------------
static bool radarInit() {
  while (Serial1.available()) Serial1.read();         // drop boot chatter / stale bytes
  if (hu.begin() != 0) return false;                  // not answering yet

  uint8_t mode = hu.getWorkMode();
  if (mode != 2) {                                    // not in sleep mode -> switch once
    Serial.println("[C1001] switching to sleep mode (takes ~20 s, once)");
    if (hu.configWorkMode(hu.eSleepMode) != 0) return false;
    hu.sensorRet();                                   // reset required after mode change
    vTaskDelay(pdMS_TO_TICKS(12000));                 // let the radar reboot fully
    while (Serial1.available()) Serial1.read();
    if (hu.getWorkMode() != 2) return false;
  }
  hrSm.reset(); brSm.reset(); hrBaseSm.reset();
  return true;
}

void sensorTask(void*) {
  SensorData cur;
  uint32_t n = 0, lastSess = 0;
  int failStreak = 0;

  // NEW: presence debounce + ghost-reflection tracking state
  int presenceZeroStreak = 0;
  int presenceOneStreak  = 0;
  uint32_t zeroMoveSinceMs = 0;

  for (;;) {
    // ---- (re)initialise when needed ----
    if (!radarOk || g_sensorReset) {
      bool userAsk = g_sensorReset; g_sensorReset = false;
      if (userAsk) {
        Serial.println("[C1001] recalibrating (user) — LED off/on + sensor reset");
        hu.configLEDLight(hu.eHPLed, 0);                // LED off — visible "recalibrating" cue
        hu.sensorRet();
        vTaskDelay(pdMS_TO_TICKS(11000));
        hu.configLEDLight(hu.eHPLed, 1);                // LED back on once reset completes
      }
      radarOk = radarInit();
      if (!radarOk) { vTaskDelay(pdMS_TO_TICKS(2000)); continue; }   // retry every ~2 s, web stays up
      failStreak = 0;
      presenceZeroStreak = presenceOneStreak = 0; zeroMoveSinceMs = 0;
      Serial.println("[C1001] link up, sleep mode active");
    }

    // ---- harvest everything the radar PUSHED since last cycle (no queries) ----
    hu.pump();

    auto rep1 = [](uint8_t con, uint8_t qcmd) -> int {
      uint8_t d[16];
      int n = hu.cacheGet(con, qcmd & 0x7F, d, sizeof(d), 1600);
      return n > 0 ? d[0] : -1;
    };

    // ---- FAST group: presence / motion / vitals (every cycle, ~0.4 s) ----
    int rawP = rep1(0x80, 0x81);
    if (rawP < 0) rawP = hu.smHumanData(hu.eHumanPresence);

    // CHANGED: presence debounce — a single stale/ghost "1" frame in the
    // cache no longer keeps presence stuck; requires PRESENCE_ZERO_DEBOUNCE
    // consecutive real zero-reads before presence actually clears, but a
    // fresh "1" is accepted immediately (fast to detect someone arriving).
    if (rawP == 0) {
      presenceZeroStreak++; presenceOneStreak = 0; failStreak = 0;
    } else if (rawP == 1) {
      presenceOneStreak++; presenceZeroStreak = 0; failStreak = 0;
    } else if (++failStreak >= 12) {                     // ~10 s of dead/garbage answers
      Serial.println("[C1001] link lost, auto-reinit");
      radarOk = false; continue;
    }
    if (presenceZeroStreak >= PRESENCE_ZERO_DEBOUNCE) cur.presence = 0;
    else if (presenceOneStreak >= 1)                  cur.presence = 1;

    int v;
    v = rep1(0x80, 0x82); if (v < 0) v = hu.smHumanData(hu.eHumanMovement);    upd(cur.motion, v, 0, 2);
    v = rep1(0x80, 0x83); if (v < 0) v = hu.smHumanData(hu.eHumanMovingRange); upd(cur.movingRange, v, 0, 100);

    // NEW: ghost-reflection filter — presence=1 with sustained near-zero
    // movement (a fan/curtain/HVAC reflection, not a real person) for
    // GHOST_ZERO_MOVE_MS gets force-cleared. A real person still shifts or
    // breathes enough to nudge movingRange periodically.
    if (cur.presence && cur.movingRange <= GHOST_MOVE_FLOOR) {
      if (!zeroMoveSinceMs) zeroMoveSinceMs = millis();
      if (millis() - zeroMoveSinceMs > GHOST_ZERO_MOVE_MS) {
        cur.presence = 0;
        presenceZeroStreak = PRESENCE_ZERO_DEBOUNCE;  // keep it cleared next cycle too
        Serial.println("[C1001] presence looks like a ghost reflection (sustained zero-motion) — clearing");
      }
    } else {
      zeroMoveSinceMs = 0;
    }

    int rawHR = rep1(0x85, 0x82); if (rawHR < 0) rawHR = hu.getHeartRate();
    int rawBR = rep1(0x81, 0x82); if (rawBR < 0) rawBR = hu.getBreatheValue();
    if (!cur.presence) { hrSm.reset(); brSm.reset(); }   // no one -> drop vitals immediately
    else {
      if (rawHR >= 40 && rawHR <= 180) hrSm.push(rawHR); else hrSm.noData();
      if (rawBR >=  6 && rawBR <=  30) brSm.push(rawBR); else brSm.noData();
    }
    cur.heartRate  = hrSm.value();
    cur.breathRate = brSm.value();

    v = rep1(0x81, 0x81); if (v < 0) v = hu.getBreatheState();             upd(cur.breathState, v, 1, 4);
    v = rep1(0x84, 0x81); if (v < 0) v = hu.smSleepData(hu.eInOrNotInBed); upd(cur.inBed, v, 0, 1);
    v = rep1(0x84, 0x82); if (v < 0) v = hu.smSleepData(hu.eSleepState);   upd(cur.sleepState, v, 0, 3);
    if (!cur.presence) cur.inBed = 0;   // radar's in-bed flag goes stale when you walk away
                                          // (now fires promptly thanks to the presence debounce + ghost filter above)

    // ---- MEDIUM group: live session durations (every 4th cycle, ~1.6 s) ----
    if (n % 4 == 0) {
      upd(cur.distance,    hu.smHumanData(hu.eHumanDistance),    0, 1200);
      v = hu.smSleepData(hu.eWakeDuration);      if (v != 255) upd(cur.wakeDur,  v, 0, 1440);
      v = hu.smSleepData(hu.eLightsleep);        if (v != 255) upd(cur.lightDur, v, 0, 1440);
      v = hu.smSleepData(hu.eDeepSleepDuration); if (v != 255) upd(cur.deepDur,  v, 0, 1440);
      upd(cur.quality,     hu.smSleepData(hu.eSleepQuality),      0, 100);
      upd(cur.disturbance, hu.smSleepData(hu.eSleepDisturbances), 0, 3);
      upd(cur.rating,      hu.smSleepData(hu.eSleepQualityRating),0, 3);
      upd(cur.abnormal,    hu.smSleepData(hu.eAbnormalStruggle),  0, 2);
    }

    // ---- SLOW group: composite + nightly statistics (every 8th cycle, ~3.2 s) ----
    if (n % 8 == 0) {
      sSleepComposite c = hu.getSleepComposite();
      upd(cur.cResp, c.averageRespiration, 6, 30);  upd(cur.cHeart, c.averageHeartbeat, 40, 180);
      upd(cur.cTurn, c.turnoverNumber, 0, 120);     upd(cur.cLarge, c.largeBodyMove, 0, 100);
      upd(cur.cMinor, c.minorBodyMove, 0, 100);     upd(cur.cApnea, c.apneaEvents, 0, 40);

      sSleepStatistics s = hu.getSleepStatistics();
      upd(cur.sScore, s.sleepQualityScore, 1, 100); upd(cur.sSleepTime, s.sleepTime, 1, 1440);
      upd(cur.sWake, s.wakeDuration, 0, 100);       upd(cur.sShallow, s.shallowSleepPercentage, 0, 100);
      upd(cur.sDeep, s.deepSleepPercentage, 0, 100);upd(cur.sOOB, s.timeOutOfBed, 0, 200);
      upd(cur.sExit, s.exitCount, 0, 50);           upd(cur.sTurn, s.turnOverCount, 0, 200);
      upd(cur.sResp, s.averageRespiration, 6, 30);  upd(cur.sHeart, s.averageHeartbeat, 40, 180);
      upd(cur.sApnea, s.apneaEvents, 0, 60);
    }

    cur.valid = true; cur.seq = ++n;

    // ---- our sleep-staging engine: one feed per poll, reports at session end ----
    SleepLive lv; NightReport rp; bool repReady = false;
    sleepFeed(cur, lv, rp, repReady);

    // NEW: session was just (re)confirmed — tell Firebase.ino to stop
    // treating the radar's own nightly counters as belonging to this
    // fresh session (see Firebase.ino's firebasePushLive() change).
    static bool prevSessConfirmedFlag = false;
    if (lv.active && !prevSessConfirmedFlag) g_radarStatsResetPending = true;
    prevSessConfirmedFlag = lv.active;

    if (repReady) {
      if (cur.cApnea > 0 && cur.cApnea <= 40) rp.apnea = cur.cApnea;
      reportSave(rp);
      String sid = sleepSessionId();
      if (WiFi.status() == WL_CONNECTED && sid.length())
        firebasePushHistory(rp, sid, false);
    } else if (sleepSessionDuePush()) {
      NightReport snap;
      if (sleepSessionSnapshot(snap)) {
        if (cur.cApnea > 0 && cur.cApnea <= 40) snap.apnea = cur.cApnea;
        String sid = sleepSessionId();
        if (WiFi.status() == WL_CONNECTED && sid.length()) {
          firebasePushHistory(snap, sid, true);
          sleepSessionMarkPushed();
        }
      }
    }

    xSemaphoreTake(mux, portMAX_DELAY);
    g = cur;
    live = lv;
    if (repReady) lastReport = rp;

    static bool prevActive = false;
    if (lv.active && !prevActive) { sessN = 0; sessStart = 0; lastSess = 0; }
    prevActive = lv.active;

    if (millis() - lastSess >= 60000UL) {
      lastSess = millis();
      SessSample sm;
      sm.stage = (uint8_t)lv.stage;
      sm.hr    = (uint8_t)cur.heartRate;
      sm.br    = (uint8_t)cur.breathRate;
      if (sessN < SESS_MAX) sessBuf[(sessStart + sessN++) % SESS_MAX] = sm;
      else { sessBuf[sessStart] = sm; sessStart = (sessStart + 1) % SESS_MAX; }
    }
    xSemaphoreGive(mux);

    vTaskDelay(pdMS_TO_TICKS(400));
  }
}