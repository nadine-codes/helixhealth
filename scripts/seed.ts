import "./_env";
import { admin, ensureDemoUser } from "./lib";
import { PRIORS } from "@/lib/priors";
import { SIGNAL_DEF_BY_KEY } from "@/lib/signals-catalog";
import { generateTimeline, generateCycleTimeline } from "@/lib/seed-timeline";
import type { SignalRow } from "@/lib/types";

const BRIEFING = `Over the past three weeks your recovery has slipped from 78 to 58, and afternoon fatigue has roughly doubled. The strongest driver appears to be inconsistent sleep timing: your bedtime has varied by over two hours most nights since mid-May, dragging down deep sleep, HRV, and daytime energy. Your weight is trending down nicely on your current plan, but lower activity from poor recovery is starting to work against you. Highest-impact step: stabilize your sleep window.`;

async function main() {
  const sb = admin();
  const userId = await ensureDemoUser(sb);
  console.log("Demo user:", userId);

  // --- priors (shared knowledge base) ---
  const { error: pErr } = await sb.from("priors").upsert(
    PRIORS.map((p) => ({
      id: p.id,
      cause: p.cause,
      effect: p.effect,
      type: p.type,
      mechanism: p.mechanism,
      evidence_signals: p.evidence_signals,
      confidence: p.confidence,
      domain: p.domain,
      requires_clinician: p.requires_clinician,
    }))
  );
  if (pErr) throw pErr;
  console.log(`Seeded ${PRIORS.length} priors.`);

  // --- clean previous demo data (idempotent reseed) ---
  await sb.from("signals").delete().eq("user_id", userId);
  await sb.from("interventions").delete().eq("user_id", userId);
  await sb.from("insights").delete().eq("user_id", userId);

  // --- daily time-series signals ---
  const points = generateTimeline();
  const rows: SignalRow[] = points.map((p) => {
    const def = SIGNAL_DEF_BY_KEY[p.key];
    return {
      user_id: userId,
      key: p.key,
      name: def.name,
      type: def.type,
      value: p.value,
      unit: def.unit,
      window_date: p.window_date,
      status: null,
      direction: null,
      source: "seeded",
    };
  });

  // --- daily cycle phase signal ---
  for (const c of generateCycleTimeline()) {
    rows.push({
      user_id: userId,
      key: "cycle_phase",
      name: "Cycle Phase",
      type: "cycle",
      value: null,
      text_value: c.phase,
      unit: null,
      window_date: c.window_date,
      status: null,
      direction: null,
      source: "seeded",
    });
  }

  // batch insert
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await sb.from("signals").insert(rows.slice(i, i + BATCH));
    if (error) throw error;
  }
  console.log(`Seeded ${rows.length} signal rows (incl. cycle).`);

  // --- daily briefing (intelligent on arrival) ---
  const { error: bErr } = await sb.from("insights").insert({
    user_id: userId,
    kind: "briefing",
    question: null,
    cache_key: "daily_briefing",
    payload: { text: BRIEFING, top_action: "Stabilize your sleep window" },
    narrative: BRIEFING,
    confidence: 0.8,
  });
  if (bErr) throw bErr;
  console.log("Seeded daily briefing.");

  console.log("\nSeed complete. Demo state = no bloodwork uploaded, no GLP-1 logged.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
