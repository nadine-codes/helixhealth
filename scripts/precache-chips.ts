import "./_env";
import { admin, ensureDemoUser } from "./lib";
import { SUGGESTED_QUESTIONS } from "@/components/AskWhy";
import { assembleEvidence } from "@/lib/engine/evidence";
import { runInsight } from "@/lib/engine/insight";
import {
  buildCacheKey,
  getCurrentCyclePhase,
  getInterventions,
  getSignals,
  persistInsight,
} from "@/lib/data";

// Pre-compute and cache the 4 suggested-question insights for the CURRENT demo
// evidence state, so the /api/insight cache-first path returns instantly (no
// Opus call, no function timeout) when a judge clicks a chip.
//
// This does NOT change the demo DB state (signals/interventions); it only writes
// kind:'insight' cache rows keyed by the context-aware cache key.
async function main() {
  const sb = admin();
  const userId = await ensureDemoUser(sb);

  const [signals, interventions, cyclePhase] = await Promise.all([
    getSignals(sb, userId),
    getInterventions(sb, userId),
    getCurrentCyclePhase(sb, userId),
  ]);

  const ctx = {
    hasBloodwork: signals.some((s) => s.source === "bloodwork_pdf"),
    hasGlp1: interventions.some((i) => i.key === "glp1"),
  };
  console.log("Demo user:", userId);
  console.log("Evidence state:", ctx, "| cyclePhase:", cyclePhase);
  console.log(`Pre-caching ${SUGGESTED_QUESTIONS.length} questions...\n`);

  for (const question of SUGGESTED_QUESTIONS) {
    const cacheKey = buildCacheKey(question, ctx);
    const t0 = Date.now();
    const packet = assembleEvidence({
      question,
      signals,
      interventions,
      cyclePhase,
    });
    const insight = await runInsight(packet);
    const elapsed = Date.now() - t0;

    // Idempotent: clear any prior cache row for this exact key before inserting.
    await sb
      .from("insights")
      .delete()
      .eq("user_id", userId)
      .eq("kind", "insight")
      .eq("cache_key", cacheKey);
    await persistInsight(sb, userId, insight, { cacheKey });

    console.log(`  cached (${elapsed}ms, Opus): "${question}"`);
    console.log(`    cache_key: ${cacheKey}`);
  }

  // Confirm the rows exist.
  const { data: rows } = await sb
    .from("insights")
    .select("cache_key")
    .eq("user_id", userId)
    .eq("kind", "insight");
  console.log(`\nInsight cache rows now present: ${rows?.length ?? 0}`);
  console.log("Pre-cache complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
