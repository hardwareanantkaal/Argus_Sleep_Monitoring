// Argus Sleep Monitoring · Sleep.ino — on-device sleep-staging engine.
//
// WHY THIS EXISTS: the C1001's internal staging needs 15-20+ minutes of
// in-bed data before it reports anything (sleepState stays "None"), and its
// nightly-statistics frame arrives only once per completed night — useless
// for naps, and corrupt frames used to flood the history with junk numbers.
// This engine stages every minute from movement + vitals, works from minute
// one, and builds the night report itself so it can also be generated on
// demand.
//
// Runs entirely inside sensorTask (single thread): sleepFeed() is called once
// per radar poll (~0.4 s) and finalises one staging epoch per minute.
//
// Staging rules (epoch = 1 minute):
//   in-bed tracking : starts counting the moment presence + inBed are true
//   SESSION CONFIRMED: light or deep sleep sustained for
//                    SESSION_CONFIRM_EP consecutive minutes (default 5) —
//                    only then does history/Firebase actually start
//                    receiving this session. Time spent in bed before that
//                    point is NOT lost — it's still included once confirmed
//                    (see sessionConfirmedAt backdating below).
//   asleep (light) : ONSET_QUIET_EP consecutive quiet minutes (back-dated)
//   deep           : DEEP_AFTER_EP very-quiet minutes AND heart rate below
//                    the awake-in-bed baseline (skipped if no HR lock)
//   awakening      : sustained movement while asleep
//   turnover       : brief movement spike while asleep (stays asleep)
//   session ends   : out of bed/zone OOB_END_EP min, or "End session" button
//
// ONE session per night, not one every few minutes: a session keeps its own
// stable ID (sessionStartEpoch, set once when confirmed) for its entire
// life. The live report is rebuilt and pushed to the SAME Firebase history
// node every SESSION_PUSH_EP minutes while the session is running — it is
// never re-created as a new node mid-session, only ever updated in place.
#include "types.h"
#include "config.h"
#include <time.h>

// ---- per-epoch accumulators ----
static uint32_t epStart = 0;
static int  nSamp=0, sumRange=0, bursts=0, presCnt=0, bedCnt=0;
static long sumHR=0;  static int nHR=0;
static long sumBR=0;  static int nBR=0;

// ---- session state ----
static bool sOn=false;            // in-bed tracking is running (may not be "confirmed" yet)
static bool sConfirmed=false;     // has hit SESSION_CONFIRM_EP asleep minutes -> real session
static int  stage=3;                       // 0 deep, 1 light, 2 awake, 3 none
static int  bedMin=0, deepMin=0, lightMin=0, awakeMin=0;
static int  quietRun=0, vQuietRun=0, oobRun=0, onset=-1, wakes=0, turns=0;
static int  confirmRun=0;                  // consecutive light-or-deep minutes toward confirmation
static int  hrBase=0;                      // awake-in-bed heart-rate baseline
static long sesHR=0;  static int sesHRn=0; // averaged over asleep minutes only
static long sesBR=0;  static int sesBRn=0;
static char sinceClk[17]="0000-00-00 00:00";  // "YYYY-MM-DD HH:MM" session start clock
static uint32_t sessionEpoch=0;            // stable per-session id (unix time when confirmed), 0 = none yet
static int  epochsSinceLastPush=0;         // counts staging epochs since the last Firebase live-session push

// Writes "YYYY-MM-DD HH:MM" (local time) into out, which must be at least
// 17 bytes (16 chars + null). Falls back to a dashed placeholder of the same
// width if NTP hasn't synced yet, so callers can always safely copy 17 bytes.
static void clockNow(char* out) {
  struct tm t;
  if (getLocalTime(&t, 20))
    snprintf(out, 17, "%04d-%02d-%02d %02d:%02d",
             t.tm_year + 1900, t.tm_mon + 1, t.tm_mday, t.tm_hour, t.tm_min);
  else
    strcpy(out, "0000-00-00 00:00");
}

// ---- stage-change timeline: one entry each time the stage actually changes ----
// Key = clock time ("HH:MM") the change happened, value = status string.
// Recorded only on a REAL transition (not every epoch), so a night with 5
// stage changes produces exactly 5 entries, not one per minute.
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

// Timeline entries stay clock-time-only ("HH:MM") — they're keyed within a
// single session/night, so a bare date-less key is still unambiguous and
// keeps the JSON payload small. Only startTime/endTime get the full date.
static void timelinePush(int st) {
  if (timelineN >= TIMELINE_MAX) return;   // one very long/broken night — stop growing, keep what we have
  struct tm t;
  if (getLocalTime(&t, 20))
    snprintf(timeline[timelineN].time, 6, "%02d:%02d", t.tm_hour, t.tm_min);
  else
    strcpy(timeline[timelineN].time, "--:--");
  strlcpy(timeline[timelineN].status, statusName(st), sizeof(timeline[timelineN].status));
  timelineN++;
}

static void timelineReset() { timelineN = 0; }

// Current timeline as a JSON object body — e.g. {"12:00":"Light","01:00":"Deep"}
// — WITHOUT the surrounding braces (caller wraps it), so it can be embedded
// as a nested field in both /live and /history payloads. "" if empty.
String sleepTimelineJson() {
  if (!timelineN) return "";
  String out; out.reserve(timelineN * 18 + 4);
  for (int i = 0; i < timelineN; i++) {
    if (i) out += ",";
    out += "\"" + String(timeline[i].time) + "\":\"" + String(timeline[i].status) + "\"";
  }
  return out;
}

// 45% efficiency + 25% deep share (target 25%) + 15% duration (target 7 h)
// + 15% few awakenings. Clamped 1..99 so a junk-free score is always plausible.
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

// dropTrail: minutes spent already-gone before the out-of-bed timeout fired
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
  r.apnea    = 0;                       // caller fills from radar if sane
  r.score    = scoreOf(r.bedMin, r.sleepMin, r.deepMin, r.wakes);
  r.when[0]  = 0;                       // stamped by reportSave()
  memcpy(r.startTime, sinceClk, 17);    // when this session began (date + time, set once at confirmation)
  clockNow(r.endTime);                  // "now" — final time on session end, latest refresh time in-progress
}

// Current session's stable Firebase key, or "" if no session is confirmed
// yet. Same value for the entire life of one session — callers (Firebase.ino)
// use this instead of the report's own timestamp so a long night updates ONE
// history node instead of creating a new one every push.
String sleepSessionId() {
  if (!sessionEpoch) return "";
  return "s" + String(sessionEpoch);
}

// True once this session has been confirmed (SESSION_CONFIRM_EP light/deep
// minutes reached) and it's been at least SESSION_PUSH_EP epochs since the
// last live push — i.e. "time to refresh Firebase now". Caller should build
// a report via sleepFeed's repReady/outRep path is for the FINAL save; this
// separate helper is for the periodic in-progress push while still asleep.
bool sleepSessionDuePush() {
  return sConfirmed && epochsSinceLastPush >= SESSION_PUSH_EP;
}
void sleepSessionMarkPushed() { epochsSinceLastPush = 0; }

// Build a report snapshot from the CURRENTLY RUNNING session, for periodic
// in-progress Firebase pushes (session hasn't ended, just refreshing).
// Returns false if there's no confirmed session running right now.
bool sleepSessionSnapshot(NightReport& r) {
  if (!sConfirmed) return false;
  buildReport(r, 0);           // dropTrail=0: nothing to trim, session is still live
  return true;
}
void sleepFeed(const SensorData& s, SleepLive& outLive,
               NightReport& outRep, bool& repReady) {
  repReady = false;
  uint32_t now = millis();
  uint32_t epLen = SLEEP_EPOCH_SEC * 1000UL;
  if (!epStart) epStart = now;

  // Radar outage / long stall: sleepFeed wasn't called for several epochs,
  // so the accumulators mix samples that are minutes apart. A staging
  // decision from that mush would be garbage — restart the epoch cleanly.
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

  // ---- epoch boundary: one staging decision per "minute" ----
  if (now - epStart >= epLen && nSamp >= 3) {
    int  meanRange = sumRange / nSamp;
    int  burstPct  = bursts * 100 / nSamp;   // % of samples spiking >= BURST_RANGE
    bool present   = presCnt * 2 > nSamp;
    bool inbed     = present && bedCnt * 2 > nSamp;
    int  epHR      = nHR ? (int)(sumHR/nHR) : 0;
    int  epBR      = nBR ? (int)(sumBR/nBR) : 0;
    // burst thresholds as a fraction of the epoch, so they hold at any
    // epoch length: 4% of a 60 s epoch ≈ 2.4 s of movement spikes.
    bool quiet     = inbed && meanRange <= QUIET_RANGE && burstPct <= 4;
    bool vQuiet    = quiet && meanRange <= 4 && burstPct <= 1;

    if (!sOn) {
      if (inbed) {                              // ---- in-bed tracking begins ----
        resetSession(); sOn = true; stage = 2;
        clockNow(sinceClk);
        Serial.println(F("[SLEEP] in bed — tracking started (not yet a confirmed session)"));
      }
    } else {
      int stageBefore = stage;                  // for timeline change-detection below
      bedMin++;
      if (epochsSinceLastPush >= 0) epochsSinceLastPush++;   // counts once tracking is running
      if (!present) {                           // out of bed / out of zone
        oobRun++; awakeMin++;
        stage = 2; quietRun = vQuietRun = 0; confirmRun = 0;
      } else {
        oobRun = 0;
        if (stage == 2 && epHR > 0)             // learn baseline while awake
          hrBase = hrBase ? (hrBase*3 + epHR)/4 : epHR;

        if (stage == 2) {                       // awake -> falling asleep?
          awakeMin++;
          quietRun = quiet ? quietRun + 1 : 0;
          if (quietRun >= ONSET_QUIET_EP) {
            stage = 1;                          // asleep — back-date onset
            awakeMin -= quietRun; lightMin += quietRun;
            confirmRun = quietRun;              // these quiet minutes also count toward confirmation
            if (onset < 0) onset = max(0, bedMin - quietRun);
            vQuietRun = vQuiet ? 1 : 0;
            Serial.println(F("[SLEEP] fell asleep (light)"));
          }
        } else {                                // asleep (light or deep)
          // awakening = sustained movement (>=13% of the epoch ≈ 8 s) or
          // high mean activity for the whole minute
          bool moveWake = meanRange >= WAKE_RANGE || burstPct >= 13;
          if (moveWake) {
            stage = 2; wakes++; awakeMin++; quietRun = vQuietRun = 0; confirmRun = 0;
            Serial.println(F("[SLEEP] awakening (movement)"));
          } else {
            if (burstPct >= 3) turns++;         // brief stir (~2 s), still asleep
            vQuietRun = vQuiet ? vQuietRun + 1 : 0;
            confirmRun++;                       // still light or deep -> counts toward confirmation
            if (stage == 1) {
              bool hrLow = epHR > 0 && hrBase > 0 &&
                           epHR <= hrBase - max(3, hrBase/20);
              if (vQuietRun >= DEEP_AFTER_EP && (hrLow || hrBase==0 || epHR==0))
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

        // ---- SESSION CONFIRMATION: light or deep sustained for
        // SESSION_CONFIRM_EP consecutive minutes -> this becomes a real,
        // Firebase-visible session with a stable ID for its whole life.
        bool justConfirmed = false;
        if (!sConfirmed && confirmRun >= SESSION_CONFIRM_EP) {
          sConfirmed = true;
          justConfirmed = true;
          sessionEpoch = (uint32_t)time(nullptr);   // stable id for the WHOLE night
          if (!sessionEpoch) sessionEpoch = (uint32_t)(millis()/1000);  // pre-NTP fallback
          epochsSinceLastPush = SESSION_PUSH_EP;     // push immediately on confirmation
          Serial.printf("[SLEEP] session CONFIRMED (id=%lu) — now visible in history\n",
                        (unsigned long)sessionEpoch);
        }

        // ---- stage-change timeline: one entry per REAL transition, only
        // once the session is confirmed (matches the spec: tracking starts
        // the moment light/deep sleep begins). The confirmation moment
        // itself always gets its first entry (e.g. "12:00 AM = Light").
        if (sConfirmed && (justConfirmed || stage != stageBefore)) {
          timelinePush(stage);
          Serial.printf("[SLEEP] timeline: %s = %s\n", timeline[timelineN-1].time, statusName(stage));
        }
      }
      if (oobRun >= OOB_END_EP) {               // ---- auto end ----
        if (sConfirmed && bedMin - oobRun >= AUTO_SAVE_MIN && deepMin + lightMin >= 1) {
          if (stage != 3) { stage = 3; timelinePush(3); }   // final "None" entry — session truly over
          buildReport(outRep, oobRun); repReady = true;
        } else if (sConfirmed) {
          Serial.println(F("[SLEEP] confirmed session ended too short to keep, discarded"));
        }
        // unconfirmed tracking that never reached SESSION_CONFIRM_EP simply
        // vanishes here — it was never visible in history/Firebase anyway.
        resetSession();
      }
    }
    epStart = now; nSamp = 0; sumRange = 0; bursts = 0;
    presCnt = bedCnt = 0; sumHR = sumBR = 0; nHR = nBR = 0;
  }

  // ---- manual end (dashboard "End session" button) ----
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