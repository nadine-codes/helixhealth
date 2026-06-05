import type { SignalType } from "./types";

export interface SignalDef {
  key: string;
  name: string;
  type: SignalType;
  unit: string;
  baseline: number;
  // "lower_is_better" means rising values are a negative trend (e.g. fatigue).
  higherIsBetter: boolean;
  // Whether to surface this as a prominent dashboard tile.
  tile?: boolean;
  decimals?: number;
}

// Time-series signals seeded daily 2026-03-06 -> 2026-06-04.
export const SIGNAL_DEFS: SignalDef[] = [
  { key: "sleep_duration", name: "Sleep Duration", type: "sleep", unit: "h", baseline: 7.4, higherIsBetter: true, decimals: 1 },
  { key: "sleep_consistency", name: "Sleep Consistency", type: "sleep", unit: "score", baseline: 82, higherIsBetter: true, tile: true },
  { key: "sleep_quality", name: "Sleep Quality", type: "sleep", unit: "score", baseline: 80, higherIsBetter: true },
  { key: "deep_sleep", name: "Deep Sleep", type: "sleep", unit: "min", baseline: 95, higherIsBetter: true },
  { key: "hrv", name: "HRV", type: "physiology", unit: "ms", baseline: 62, higherIsBetter: true, tile: true },
  { key: "resting_hr", name: "Resting HR", type: "physiology", unit: "bpm", baseline: 54, higherIsBetter: false },
  { key: "recovery_score", name: "Recovery", type: "recovery", unit: "score", baseline: 78, higherIsBetter: true, tile: true },
  { key: "activity_level", name: "Daily Activity", type: "activity", unit: "steps", baseline: 9200, higherIsBetter: true, tile: true },
  { key: "workout_performance", name: "Workout Performance", type: "activity", unit: "score", baseline: 75, higherIsBetter: true },
  { key: "weight_trend", name: "Weight Trend", type: "activity", unit: "lbs", baseline: 162, higherIsBetter: false, tile: true, decimals: 1 },
  { key: "calorie_intake", name: "Calorie Intake", type: "nutrition", unit: "kcal", baseline: 2050, higherIsBetter: true },
  { key: "protein_intake", name: "Protein Intake", type: "nutrition", unit: "g", baseline: 115, higherIsBetter: true, tile: true },
  { key: "hydration", name: "Hydration", type: "nutrition", unit: "L", baseline: 2.4, higherIsBetter: true, decimals: 1 },
  { key: "afternoon_fatigue", name: "Afternoon Fatigue", type: "symptom", unit: "0-10", baseline: 3, higherIsBetter: false, tile: true },
  { key: "energy_level", name: "Energy", type: "symptom", unit: "0-10", baseline: 7, higherIsBetter: true },
  { key: "brain_fog", name: "Brain Fog", type: "symptom", unit: "0-10", baseline: 2, higherIsBetter: false },
  { key: "mood", name: "Mood", type: "symptom", unit: "0-10", baseline: 7, higherIsBetter: true },
  { key: "cravings", name: "Cravings", type: "symptom", unit: "0-10", baseline: 3, higherIsBetter: false },
  { key: "exercise_capacity", name: "Exercise Capacity", type: "biomarker", unit: "score", baseline: 72, higherIsBetter: true },
];

export const SIGNAL_DEF_BY_KEY: Record<string, SignalDef> = Object.fromEntries(
  SIGNAL_DEFS.map((d) => [d.key, d])
);

// Point-in-time biomarkers revealed via the Act 2 PDF upload.
export interface BiomarkerDef {
  key: string;
  name: string;
  unit: string;
  baselineFeb: number;
  uploadedMay: number;
  refLow: number | null;
  refHigh: number | null;
  flagged: boolean; // out-of-range in the May panel
  decimals?: number;
}

export const BIOMARKERS: BiomarkerDef[] = [
  { key: "ferritin", name: "Ferritin", unit: "ng/mL", baselineFeb: 48, uploadedMay: 18, refLow: 30, refHigh: 200, flagged: true },
  { key: "vitamin_d", name: "Vitamin D", unit: "ng/mL", baselineFeb: 42, uploadedMay: 34, refLow: 30, refHigh: 100, flagged: false },
  { key: "tsh", name: "TSH", unit: "mIU/L", baselineFeb: 2.1, uploadedMay: 2.4, refLow: 0.4, refHigh: 4.0, flagged: false, decimals: 1 },
  { key: "hs_crp", name: "hs-CRP", unit: "mg/L", baselineFeb: 0.8, uploadedMay: 1.1, refLow: null, refHigh: 1.0, flagged: false, decimals: 1 },
  { key: "fasting_glucose", name: "Fasting Glucose", unit: "mg/dL", baselineFeb: 88, uploadedMay: 91, refLow: 70, refHigh: 99, flagged: false },
  { key: "vitamin_b12", name: "Vitamin B12", unit: "pg/mL", baselineFeb: 520, uploadedMay: 480, refLow: 200, refHigh: 900, flagged: false },
  { key: "hemoglobin", name: "Hemoglobin", unit: "g/dL", baselineFeb: 13.6, uploadedMay: 12.4, refLow: 12.0, refHigh: 15.5, flagged: false, decimals: 1 },
];

export const ANCHOR_DATE = "2026-06-04";
export const SEED_START_DATE = "2026-03-06";
export const GLP1_START = "2026-05-07";
export const SLEEP_CRUNCH_START = "2026-05-14";
export const LAB_UPLOAD_DATE = "2026-05-28";
