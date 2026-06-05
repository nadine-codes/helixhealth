import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Insight,
  InterventionRow,
  SignalRow,
} from "@/lib/types";

export async function getSignals(
  sb: SupabaseClient,
  userId: string
): Promise<SignalRow[]> {
  const { data, error } = await sb
    .from("signals")
    .select("*")
    .eq("user_id", userId)
    .order("window_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SignalRow[];
}

export async function getInterventions(
  sb: SupabaseClient,
  userId: string
): Promise<InterventionRow[]> {
  const { data, error } = await sb
    .from("interventions")
    .select("*")
    .eq("user_id", userId)
    .order("started", { ascending: true });
  if (error) throw error;
  return (data ?? []) as InterventionRow[];
}

export async function getCurrentCyclePhase(
  sb: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await sb
    .from("signals")
    .select("text_value, window_date")
    .eq("user_id", userId)
    .eq("key", "cycle_phase")
    .order("window_date", { ascending: false })
    .limit(1);
  return data?.[0]?.text_value ?? null;
}

export async function persistInsight(
  sb: SupabaseClient,
  userId: string,
  insight: Insight,
  opts: { kind?: string; cacheKey?: string } = {}
): Promise<void> {
  const { error } = await sb.from("insights").insert({
    user_id: userId,
    kind: opts.kind ?? "insight",
    question: insight.question,
    cache_key: opts.cacheKey ?? null,
    payload: insight,
    narrative: insight.narrative,
    confidence: insight.confidence_overall ?? insight.primary_chain.confidence,
  });
  if (error) throw error;
}

// Context-aware cache key for the demo safety net. The same question in a
// different evidence state (bloodwork uploaded, GLP-1 logged) caches separately,
// so uploading labs genuinely changes the answer instead of leaking a cached one.
export function buildCacheKey(
  question: string,
  ctx: { hasBloodwork: boolean; hasGlp1: boolean }
): string {
  const q = question.trim().toLowerCase().replace(/\s+/g, " ");
  return `${q}|bw:${ctx.hasBloodwork ? 1 : 0}|glp1:${ctx.hasGlp1 ? 1 : 0}`;
}
