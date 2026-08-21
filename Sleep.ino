// Argus Sleep Monitoring · Sleep.ino — on-device sleep-staging engine.
#include "types.h"
#include "config.h"
#include <time.h>

// ---- per-epoch accumulators ----
static uint32_t epStart = 0;
static int  nSamp=0, sumRange=0, bursts=0, presCnt=0, bedCnt=0;
static long sumHR=0;  static int nHR=0;
static long sumBR=0;  static int nBR=0;

// ---- session state ----
static bool sOn=false;
static bool sConfirmed=false;
static int  stage=3;
static int  bedMin=0, deepMin=0, lightMin=0, awakeMin=0;
static int  quietRun=0, vQuietRun=0, oobRun=0, onset=-1, wakes=0, turns=0;
static int  confirmRun=0;
static int  hrBase=0;                      // awake-in-bed heart-rate baseline
static long sesHR=0;  static int sesHRn=0;
static long sesBR=0;  static int sesBRn=0;
static char sinceClk[17]="0000-00-00 00:00";
static uint32_t sessionEpoch=0;
static int  epochsSinceLastPush=0;

static void clockNow(char* out) {
  struct tm t;
  if (getLocalTime(&t, 20))
    snprintf(out, 17, "%04d-%02d-%02d %02d:%02d",
             t.tm_year + 1900, t.tm_mon + 1, t.tm_mday, t.tm_hour, t.tm_min);
  else
    strcpy(out, "0000-00-00 00:00");
}

#define TIMELINE_MAX 64
struct TimelineEntry { char time[6]; char status[10]; };
static TimelineEntry timeline[TIMELINE_MAX];
static int timelineN = 0;

static const char* statusName(int st) {
  switch (st) {
    case 0: return "Deep";
    case 1: return "Light";
    case 2: return "Awake";
    default: return "None";
  }
}

static void timelinePush(int st) {
  if (timelineN >= TIMELINE_MAX) return;
  struct tm t;
  if (getLocalTime(&t, 20))
    snprintf(timeline[timelineN].time, 6, "%02d:%02d", t.tm_hour, t.tm_min);
  else
    strcpy(timeline[timelineN].time, "--:--");
  strlcpy(timeline[timelineN].status, statusName(st), sizeof(timeline[timelineN].status));
  timelineN++;
}

static void timelineReset() { timelineN = 0; }

String sleepTimelineJson() {
  if (!timelineN) return "";
  String out; out.reserve(timelineN * 18 + 4);
  for (int i = 0; i < timelineN; i++) {
    if (i) out += ",";
    out += "\"" + String(timeline[i].time) + "\":\"" + String(timeline[i].status) + "\"";
  }
  return out;
}

static int scoreOf(int bed, int sleep, int deep, int wk) {
  if (bed <= 0 || sleep <= 0) return sleep > 0 ? 1 : 0;
  int eff   = sleep * 100 / bed;
  int deepP = deep * 100 / sleep;
  int sc = (45*eff + 25*min(100, deepP*4) + 15*min(100, sleep*100/420)
            + 15*max(0, 100 - 12*wk)) / 100;
  return constrain(sc, 1, 99);
}

static void resetSession() {
  sOn=false; sConfirmed=false; stage=3; bedMin=deepMin=lightMin=awakeMin=0;
  quietRun=vQuietRun=oobRun=0; onset=-1; wakes=turns=0; confirmRun=0; hrBase=0;
  sesHR=sesBR=0; sesHRn=sesBRn=0; strcpy(sinceClk,"0000-00-00 00:00");
  sessionEpoch=0; epochsSinceLastPush=0; timelineReset();
}

static void buildReport(NightReport& r, int dropTrail) {
  r.valid    = true;
  r.bedMin   = max(0, bedMin  - dropTrail);
  r.awakeMin = max(0, awakeMin- dropTrail);
  r.deepMin  = deepMin;  r.lightMin = lightMin;
  r.sleepMin = deepMin + lightMin;
  r.onsetMin = max(0, onset);
  r.wakes    = wakes;    r.turns = turns;
  r.avgHR    = sesHRn ? (int)(sesHR/sesHRn) : 0;
  r.avgBR    = sesBRn ? (int)(sesBR/sesBRn) : 0;
  r.apnea    = 0;
  r.score    = scoreOf(r.bedMin, r.sleepMin, r.deepMin, r.wakes);
  r.when[0]  = 0;
  memcpy(r.startTime, sinceClk, 17);
  clockNow(r.endTime);
}

String sleepSessionId() {
  if (!sessionEpoch) return "";
  return "s" + String(sessionEpoch);
}

bool sleepSessionDuePush() {
  return sConfirmed && epochsSinceLastPush >= SESSION_PUSH_EP;
}
void sleepSessionMarkPushed() { epochsSinceLastPush = 0; }

bool sleepSessionSnapshot(NightReport& r) {
  if (!sConfirmed) return false;
  buildReport(r, 0);
  return true;
}

void sleepFeed(const SensorData& s, SleepLive& outLive,
               NightReport& outRep, bool& repReady) {
  repReady = false;
  uint32_t now = millis();
  uint32_t epLen = SLEEP_EPOCH_SEC * 1000UL;
  if (!epStart) epStart = now;

  if (now - epStart >= epLen * 3) {
    epStart = now; nSamp = 0; sumRange = 0; bursts = 0;
    presCnt = bedCnt = 0; sumHR = sumBR = 0; nHR = nBR = 0;
  }

  nSamp++; sumRange += s.movingRange;
  if (s.movingRange >= BURST_RANGE) bursts++;
  if (s.presence) presCnt++;
  if (s.presence && s.inBed) bedCnt++;
  if (s.heartRate  > 0) { sumHR += s.heartRate;  nHR++; }
  if (s.breathRate > 0) { sumBR += s.breathRate; nBR++; }

  if (now - epStart >= epLen && nSamp >= 3) {
    int  meanRange = sumRange / nSamp;
    int  burstPct  = bursts * 100 / nSamp;
    bool present   = presCnt * 2 > nSamp;
    bool inbed     = present && bedCnt * 2 > nSamp;
    int  epHR      = nHR ? (int)(sumHR/nHR) : 0;
    int  epBR      = nBR ? (int)(sumBR/nBR) : 0;
    bool quiet     = inbed && meanRange <= QUIET_RANGE && burstPct <= 4;
    bool vQuiet    = quiet && meanRange <= 4 && burstPct <= 1;

    if (!sOn) {
      if (inbed) {
        resetSession(); sOn = true; stage = 2;
        clockNow(sinceClk);
        Serial.println(F("[SLEEP] in bed — tracking started (not yet a confirmed session)"));
      }
    } else {
      int stageBefore = stage;
      bedMin++;
      if (epochsSinceLastPush >= 0) epochsSinceLastPush++;
      if (!present) {
        oobRun++; awakeMin++;
        stage = 2; quietRun = vQuietRun = 0; confirmRun = 0;
      } else {
        oobRun = 0;
        // CHANGED: baseline now learned from the SMOOTHED heart rate
        // (s.heartRate, already averaged over hrSm's rolling window in
        // Sensor.ino) instead of the raw single-epoch mean — cuts noise
        // in hrBase substantially.
        if (stage == 2 && s.heartRate > 0)
          hrBase = hrBase ? (hrBase*3 + s.heartRate)/4 : s.heartRate;

        if (stage == 2) {
          awakeMin++;
          quietRun = quiet ? quietRun + 1 : 0;
          if (quietRun >= ONSET_QUIET_EP) {
            stage = 1;
            awakeMin -= quietRun; lightMin += quietRun;
            confirmRun = quietRun;
            if (onset < 0) onset = max(0, bedMin - quietRun);
            vQuietRun = vQuiet ? 1 : 0;
            Serial.println(F("[SLEEP] fell asleep (light)"));
          }
        } else {
          bool moveWake = meanRange >= WAKE_RANGE || burstPct >= 13;
          if (moveWake) {
            stage = 2; wakes++; awakeMin++; quietRun = vQuietRun = 0; confirmRun = 0;
            Serial.println(F("[SLEEP] awakening (movement)"));
          } else {
            if (burstPct >= 3) turns++;
            vQuietRun = vQuiet ? vQuietRun + 1 : 0;
            confirmRun++;
            if (stage == 1) {
              // CHANGED: deep-sleep call now REQUIRES a real HR baseline.
              // Previously `hrBase==0` (baseline never learned) or
              // `epHR==0` (no HR lock this epoch) would ALSO trigger deep
              // sleep by default — that was a false-positive machine.
              // Now: no usable baseline/reading => stay in light, don't
              // guess. Also added a light breathing-regularity check
              // (breath rate present and not swinging wildly) as a second
              // signal, since breathRate/breathState were captured but
              // never used for staging before.
              bool hrLow = epHR > 0 && hrBase > 0 &&
                           epHR <= hrBase - max(3, hrBase/20);
              bool breathOk = epBR > 0;   // radar has a breath lock this epoch
              if (vQuietRun >= DEEP_AFTER_EP && hrLow && breathOk)
                stage = 0;
              lightMin++;
            } else {                            // deep
              bool hrUp = epHR > 0 && hrBase > 0 && epHR >= hrBase - 1;
              if (!vQuiet || hrUp) stage = 1;
              deepMin++;
            }
            if (epHR > 0) { sesHR += epHR; sesHRn++; }
            if (epBR > 0) { sesBR += epBR; sesBRn++; }
          }
        }

        bool justConfirmed = false;
        if (!sConfirmed && confirmRun >= SESSION_CONFIRM_EP) {
          sConfirmed = true;
          justConfirmed = true;
          sessionEpoch = (uint32_t)time(nullptr);
          if (!sessionEpoch) sessionEpoch = (uint32_t)(millis()/1000);
          epochsSinceLastPush = SESSION_PUSH_EP;
          Serial.printf("[SLEEP] session CONFIRMED (id=%lu) — now visible in history\n",
                        (unsigned long)sessionEpoch);
        }

        if (sConfirmed && (justConfirmed || stage != stageBefore)) {
          timelinePush(stage);
          Serial.printf("[SLEEP] timeline: %s = %s\n", timeline[timelineN-1].time, statusName(stage));
        }
      }
      if (oobRun >= OOB_END_EP) {               // ---- auto end (OOB_END_EP now 4 min, see config.h) ----
        if (sConfirmed && bedMin - oobRun >= AUTO_SAVE_MIN && deepMin + lightMin >= 1) {
          if (stage != 3) { stage = 3; timelinePush(3); }
          buildReport(outRep, oobRun); repReady = true;
        } else if (sConfirmed) {
          Serial.println(F("[SLEEP] confirmed session ended too short to keep, discarded"));
        }
        resetSession();
      }
    }
    epStart = now; nSamp = 0; sumRange = 0; bursts = 0;
    presCnt = bedCnt = 0; sumHR = sumBR = 0; nHR = nBR = 0;
  }

  if (g_endSession) {
    g_endSession = false;
    if (sConfirmed && bedMin >= MANUAL_SAVE_MIN) {
      buildReport(outRep, oobRun); repReady = true;
      Serial.println(F("[SLEEP] session ended by user, report built"));
    } else if (sOn) Serial.println(F("[SLEEP] session not yet confirmed or too short, discarded"));
    resetSession();
  }

  outLive.active  = sConfirmed;  outLive.stage    = stage;
  outLive.bedMin  = bedMin;  outLive.deepMin  = deepMin;
  outLive.lightMin= lightMin;outLive.awakeMin = awakeMin;
  outLive.sleepMin= deepMin + lightMin;
  outLive.onsetMin= onset;   outLive.wakes    = wakes;  outLive.turns = turns;
  outLive.score   = scoreOf(bedMin, deepMin + lightMin, deepMin, wakes);
  memcpy(outLive.since, sinceClk, 17);
}