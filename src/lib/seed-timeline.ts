import {
  SIGNAL_DEF_BY_KEY,
  SEED_START_DATE,
  ANCHOR_DATE,
  GLP1_START,
  SLEEP_CRUNCH_START,
} from "./signals-catalog";

// ---- Deterministic helpers (no Math.random; reruns are identical) ----

function isoToUTC(d: string): number {
  return Date.parse(d + "T00:00:00Z");
}

const DAY_MS = 86_400_000;

export function dateRange(start: string, end: string): string[] {
  const out: string[] = [];
  for (let t = isoToUTC(start); t <= isoToUTC(end); t += DAY_MS) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

export function dayIndexOf(date: string): number {
  return Math.round((isoToUTC(date) - isoToUTC(SEED_START_DATE)) / DAY_MS);
}

// Deterministic hash -> [0,1)
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // xorshift mix
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return ((h >>> 0) % 100000) / 100000;
}

// ±pct deterministic noise for (key, dayIndex).
function noise(key: string, t: number, pct: number): number {
  return (hash01(`${key}:${t}`) * 2 - 1) * pct;
}

function smoothstep(x: number): number {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
}

// Eased ramp from `from` to `to`, beginning at startIdx over durDays.
function ramp(t: number, startIdx: number, durDays: number, from: number, to: number): number {
  if (t <= startIdx) return from;
  if (t >= startIdx + durDays) return to;
  return from + (to - from) * smoothstep((t - startIdx) / durDays);
}

// ---- Cycle phase (≈28-day, late-luteal just before the anchor date) ----

const LAST_PERIOD_START = "2026-05-11"; // makes 2026-06-04 fall in late luteal
const CYCLE_LEN = 28;

export function cyclePhaseFor(date: string): string {
  const days = Math.round((isoToUTC(date) - isoToUTC(LAST_PERIOD_START)) / DAY_MS);
  const dayInCycle = ((days % CYCLE_LEN) + CYCLE_LEN) % CYCLE_LEN; // 0..27
  const d = dayInCycle + 1; // 1..28
  if (d <= 5) return "menstrual";
  if (d <= 13) return "follicular";
  if (d <= 16) return "ovulation";
  if (d <= 23) return "luteal";
  return "late_luteal";
}

function lutealPenalty(date: string): number {
  const phase = cyclePhaseFor(date);
  return phase === "late_luteal" ? 1 : phase === "luteal" ? 0.4 : 0;
}

// ---- Story-arc anchors as day indices ----

const crunch = dayIndexOf(SLEEP_CRUNCH_START); // sleep-consistency cascade (Arc 1)
const glp1 = dayIndexOf(GLP1_START); // GLP-1 protein cascade (Arc 3)

export interface DailyPoint {
  key: string;
  value: number;
  window_date: string;
}

// Raw (pre-noise) value for a signal at day index t / date.
function baseValue(key: string, t: number, date: string): number {
  const luteal = lutealPenalty(date);
  switch (key) {
    case "sleep_duration":
      return ramp(t, crunch, 21, 7.4, 7.0);
    case "sleep_consistency": // Arc 1 root cause: 82 -> ~58
      return ramp(t, crunch, 14, 82, 58);
    case "sleep_quality":
      return ramp(t, crunch, 18, 80, 66) - 4 * luteal;
    case "deep_sleep":
      return ramp(t, crunch, 18, 95, 74);
    case "hrv":
      return ramp(t, crunch - 2, 24, 62, 51) - 2 * luteal;
    case "resting_hr":
      return ramp(t, crunch - 2, 24, 54, 58) + 1.5 * luteal;
    case "recovery_score": // shared outcome: 78 -> ~58
      return ramp(t, crunch, 21, 78, 58) - 3 * luteal;
    case "activity_level":
      return ramp(t, crunch + 2, 21, 9200, 7400);
    case "workout_performance":
      return ramp(t, crunch, 21, 75, 60);
    case "weight_trend": // steadily down since GLP-1 (the intended win)
      return ramp(t, glp1, 28, 162, 158.5);
    case "calorie_intake": // sharp drop once on GLP-1
      return ramp(t, glp1, 10, 2050, 1450);
    case "protein_intake": // Arc 3 root cause: 115 -> ~70
      return ramp(t, glp1, 12, 115, 70);
    case "hydration":
      return 2.4;
    case "afternoon_fatigue": // Arc 1 outcome: 3 -> ~7
      return ramp(t, crunch, 21, 3, 7) + 0.5 * luteal;
    case "energy_level": // Arc 2 mediator: slow decline (ferritin) 7 -> 4
      return ramp(t, crunch - 10, 30, 7, 4);
    case "brain_fog":
      return ramp(t, crunch, 21, 2, 3.5);
    case "mood":
      return ramp(t, crunch, 21, 7, 6) - 0.3 * luteal;
    case "cravings": // GLP-1 suppresses; luteal raises
      return ramp(t, glp1, 10, 3, 2) + 2 * luteal;
    case "exercise_capacity": // Arc 2 mediator: 72 -> ~55
      return ramp(t, crunch - 8, 28, 72, 55);
    default:
      return SIGNAL_DEF_BY_KEY[key]?.baseline ?? 0;
  }
}

function clampForKey(key: string, v: number): number {
  const def = SIGNAL_DEF_BY_KEY[key];
  // Symptom scales 0-10.
  if (def?.unit === "0-10") return Math.max(0, Math.min(10, v));
  // Scores 0-100.
  if (def?.unit === "score") return Math.max(0, Math.min(100, v));
  return Math.max(0, v);
}

function roundForKey(key: string, v: number): number {
  const def = SIGNAL_DEF_BY_KEY[key];
  const decimals = def?.decimals ?? 0;
  const f = Math.pow(10, decimals);
  return Math.round(v * f) / f;
}

// Generate the full deterministic daily timeline for every time-series signal.
export function generateTimeline(): DailyPoint[] {
  const dates = dateRange(SEED_START_DATE, ANCHOR_DATE);
  const points: DailyPoint[] = [];
  for (const date of dates) {
    const t = dayIndexOf(date);
    for (const def of Object.values(SIGNAL_DEF_BY_KEY)) {
      // light day-to-day noise (±5%, smaller on tiny symptom scales)
      const raw = baseValue(def.key, t, date);
      const pct = def.unit === "0-10" ? 0.04 : 0.05;
      const noised = raw * (1 + noise(def.key, t, pct));
      const value = roundForKey(def.key, clampForKey(def.key, noised));
      points.push({ key: def.key, value, window_date: date });
    }
  }
  return points;
}

// Daily cycle-phase signal rows (enum stored as text).
export function generateCycleTimeline(): { window_date: string; phase: string }[] {
  return dateRange(SEED_START_DATE, ANCHOR_DATE).map((date) => ({
    window_date: date,
    phase: cyclePhaseFor(date),
  }));
}
