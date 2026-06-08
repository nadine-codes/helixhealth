import type { SupabaseClient } from "@supabase/supabase-js";
import type { EvidenceSignal, InterventionRow } from "@/lib/types";
import { assembleEvidence } from "@/lib/engine/evidence";
import { SIGNAL_DEF_BY_KEY } from "@/lib/signals-catalog";
import {
  getCurrentCyclePhase,
  getInterventions,
  getSignals,
} from "@/lib/data";

export interface DashboardData {
  briefing: { text: string; top_action?: string; root_driver?: string } | null;
  tiles: EvidenceSignal[];
  biomarkers: EvidenceSignal[];
  interventions: InterventionRow[];
  cyclePhase: string | null;
  hasBloodwork: boolean;
  hasGlp1: boolean;
}

export async function getDashboardData(
  sb: SupabaseClient,
  userId: string
): Promise<DashboardData> {
  const [signals, interventions, cyclePhase, briefingRows] = await Promise.all([
    getSignals(sb, userId),
    getInterventions(sb, userId),
    getCurrentCyclePhase(sb, userId),
    sb
      .from("insights")
      .select("payload, narrative")
      .eq("user_id", userId)
      .eq("kind", "briefing")
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  // Reuse the evidence summarizer to get tile-ready stats.
  const packet = assembleEvidence({
    question: "dashboard",
    signals,
    interventions,
    cyclePhase,
  });

  const tiles = packet.signals.filter(
    (s) => SIGNAL_DEF_BY_KEY[s.key]?.tile
  );
  const biomarkers = packet.signals.filter((s) => s.type === "biomarker" && SIGNAL_DEF_BY_KEY[s.key] === undefined);

  const briefingPayload = briefingRows.data?.[0]?.payload as
    | { text: string; top_action?: string; root_driver?: string }
    | undefined;

  return {
    briefing:
      briefingPayload ??
      (briefingRows.data?.[0]?.narrative
        ? { text: briefingRows.data[0].narrative as string }
        : null),
    tiles,
    biomarkers,
    interventions,
    cyclePhase,
    hasBloodwork: signals.some((s) => s.source === "bloodwork_pdf"),
    hasGlp1: interventions.some((i) => i.key === "glp1"),
  };
}
