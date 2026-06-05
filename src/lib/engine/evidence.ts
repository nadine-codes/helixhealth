import type {
  EvidencePacket,
  EvidenceSignal,
  InterventionRow,
  SignalRow,
  SignalStatus,
  Trend,
} from "@/lib/types";
import { SIGNAL_DEF_BY_KEY } from "@/lib/signals-catalog";

const DAY_MS = 86_400_000;

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function round(v: number, decimals = 1): number {
  const f = Math.pow(10, decimals);
  return Math.round(v * f) / f;
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / DAY_MS);
}

// Summarize one daily time-series into an EvidenceSignal.
function summarizeSeries(
  key: string,
  rows: SignalRow[],
  asOf: string
): EvidenceSignal | null {
  const def = SIGNAL_DEF_BY_KEY[key];
  const series = rows
    .filter((r) => r.value != null)
    .sort((a, b) => a.window_date.localeCompare(b.window_date));
  if (!series.length || !def) return null;

  const last7 = series.slice(-7).map((r) => r.value as number);
  const recent = round(avg(last7), def.decimals ?? 0);
  const baseline = def.baseline;
  const pct = baseline ? round(((recent - baseline) / baseline) * 100, 0) : 0;

  let trend: Trend = "flat";
  if (Math.abs(pct) >= 5) trend = recent > baseline ? "up" : "down";

  // direction-aware status
  let status: SignalStatus = "flat";
  if (trend === "up") status = "trending_up";
  else if (trend === "down") status = "trending_down";

  // change_started: first day the 7-day rolling value departed materially from baseline
  let changeStarted: string | null = null;
  const thresh = Math.abs(baseline) * 0.08;
  for (let i = 6; i < series.length; i++) {
    const roll = avg(series.slice(i - 6, i + 1).map((r) => r.value as number));
    if (Math.abs(roll - baseline) >= thresh) {
      changeStarted = series[i - 6].window_date;
      break;
    }
  }

  return {
    key,
    name: def.name,
    type: def.type,
    unit: def.unit,
    recent_value: recent,
    baseline,
    trend,
    change_started: changeStarted,
    status,
    pct_change: pct,
  };
}

// Summarize a point-in-time lab biomarker (from bloodwork upload).
function summarizeBiomarker(key: string, rows: SignalRow[]): EvidenceSignal | null {
  const series = rows
    .filter((r) => r.value != null)
    .sort((a, b) => a.window_date.localeCompare(b.window_date));
  if (!series.length) return null;
  const latest = series[series.length - 1];
  const prev = series.length > 1 ? series[series.length - 2] : null;
  const value = latest.value as number;
  const low = latest.reference_low ?? null;
  const high = latest.reference_high ?? null;

  let status: SignalStatus = "in_range";
  if (low != null && value < low) status = "low";
  else if (high != null && value > high) status = "high";

  let trend: Trend = "flat";
  let pct: number | null = null;
  if (prev?.value != null) {
    const pv = prev.value as number;
    pct = pv ? round(((value - pv) / pv) * 100, 0) : null;
    if (pct != null && Math.abs(pct) >= 5) trend = value > pv ? "up" : "down";
  }

  return {
    key,
    name: latest.name,
    type: "biomarker",
    unit: latest.unit,
    recent_value: value,
    baseline: prev?.value ?? null,
    trend,
    change_started: latest.window_date,
    status,
    pct_change: pct,
  };
}

export interface AssembleInput {
  question: string;
  asOf?: string;
  signals: SignalRow[];
  interventions: InterventionRow[];
  cyclePhase?: string | null;
}

// Build the compact evidence packet sent to Claude (build/03 §2).
export function assembleEvidence(input: AssembleInput): EvidencePacket {
  const asOf = input.asOf ?? "2026-06-04";

  const byKey = new Map<string, SignalRow[]>();
  for (const row of input.signals) {
    if (!byKey.has(row.key)) byKey.set(row.key, []);
    byKey.get(row.key)!.push(row);
  }

  const signals: EvidenceSignal[] = [];
  for (const [key, rows] of byKey) {
    const isLab = rows.some((r) => r.source === "bloodwork_pdf");
    const summary = isLab
      ? summarizeBiomarker(key, rows)
      : summarizeSeries(key, rows, asOf);
    if (summary) signals.push(summary);
  }

  // Keep the packet under ~30 signals; out-of-range biomarkers + changed signals first.
  signals.sort((a, b) => {
    const aHot = a.status === "low" || a.status === "high" ? 2 : Math.abs(a.pct_change ?? 0) >= 5 ? 1 : 0;
    const bHot = b.status === "low" || b.status === "high" ? 2 : Math.abs(b.pct_change ?? 0) >= 5 ? 1 : 0;
    return bHot - aHot;
  });

  const active = input.interventions.map((i) => ({
    key: i.key,
    name: i.name,
    started: i.started,
    weeks_active: Math.max(0, Math.round(daysBetween(i.started, asOf) / 7)),
  }));

  return {
    question: input.question,
    as_of_date: asOf,
    user_context: {
      menstruates: true,
      current_cycle_phase: input.cyclePhase ?? null,
    },
    active_interventions: active,
    signals: signals.slice(0, 30),
  };
}
