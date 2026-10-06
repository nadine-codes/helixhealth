import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildCacheKey,
  getCurrentCyclePhase,
  getInterventions,
  getSignals,
  persistInsight,
} from "@/lib/data";
import { assembleEvidence } from "@/lib/engine/evidence";
import { runInsight } from "@/lib/engine/insight";
import { isSuggestedQuestion } from "@/lib/suggested-questions";
import { redactIdentifiers } from "@/lib/redact";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawQuestion: unknown = body?.question;
    const useCache: boolean = body?.useCache ?? true;
    if (!rawQuestion || typeof rawQuestion !== "string") {
      return NextResponse.json({ error: "Missing question" }, { status: 400 });
    }
    // The browser already redacts; repeat it here for direct API calls.
    const question = redactIdentifiers(rawQuestion).text;

    const sb = await createClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const [signals, interventions, cyclePhase] = await Promise.all([
      getSignals(sb, user.id),
      getInterventions(sb, user.id),
      getCurrentCyclePhase(sb, user.id),
    ]);

    const cacheKey = buildCacheKey(question, {
      hasBloodwork: signals.some((s) => s.source === "bloodwork_pdf"),
      hasGlp1: interventions.some((i) => i.key === "glp1"),
    });

    // Privacy: everyone shares the demo account, so only the suggested chips are
    // cached. Free-typed questions may contain personal health info and are
    // answered without being stored.
    const suggested = isSuggestedQuestion(question);

    // Demo safety net: serve a pre-cached answer for this exact evidence state.
    if (useCache && suggested) {
      const { data: cached } = await sb
        .from("insights")
        .select("payload")
        .eq("user_id", user.id)
        .eq("kind", "insight")
        .eq("cache_key", cacheKey)
        .order("created_at", { ascending: false })
        .limit(1);
      if (cached?.[0]?.payload) {
        return NextResponse.json({ insight: cached[0].payload, cached: true });
      }
    }

    const packet = assembleEvidence({
      question,
      signals,
      interventions,
      cyclePhase,
    });

    const insight = await runInsight(packet);
    if (suggested) await persistInsight(sb, user.id, insight, { cacheKey });

    return NextResponse.json({ insight, cached: false });
  } catch (err) {
    console.error("/api/insight error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Insight engine failed" },
      { status: 500 }
    );
  }
}
