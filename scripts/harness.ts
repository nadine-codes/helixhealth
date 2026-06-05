import "./_env";
import {
  admin,
  ensureDemoUser,
  insertBiomarkerPanels,
  logGlp1,
  removeBiomarkers,
  removeGlp1,
} from "./lib";
import { getCurrentCyclePhase, getInterventions, getSignals, buildCacheKey, persistInsight } from "@/lib/data";
import { assembleEvidence } from "@/lib/engine/evidence";
import { runInsight } from "@/lib/engine/insight";
import type { Insight, InsightChain } from "@/lib/types";

const PRECACHE = process.argv.includes("--precache");

interface ActSpec {
  name: string;
  question: string;
  expectRoot: string[]; // acceptable root_driver signal_keys
  expectPriors: string[]; // priors that should appear among the chain edges
  setup: (sb: ReturnType<typeof admin>, userId: string) => Promise<void>;
}

const ACTS: ActSpec[] = [
  {
    name: "Act 1: sleep-consistency cascade",
    question: "Why am I exhausted every afternoon?",
    expectRoot: ["sleep_consistency"],
    expectPriors: ["P01", "P05", "P03"],
    setup: async (sb, u) => {
      await removeBiomarkers(sb, u);
      await removeGlp1(sb, u);
    },
  },
  {
    name: "Act 2: ferritin decline (after bloodwork)",
    question: "Why is my recovery declining?",
    expectRoot: ["ferritin"],
    expectPriors: ["P18", "P19", "P20"],
    setup: async (sb, u) => {
      await insertBiomarkerPanels(sb, u);
      await removeGlp1(sb, u);
    },
  },
  {
    name: "Act 3: GLP-1 protein cascade (after logging GLP-1)",
    question: "Why is my recovery worse this month?",
    expectRoot: ["glp1", "protein_intake", "appetite"],
    expectPriors: ["P29", "P30", "P13"],
    setup: async (sb, u) => {
      await insertBiomarkerPanels(sb, u);
      await logGlp1(sb, u);
    },
  },
];

function orderChain(chain: InsightChain): string[] {
  // follow edges from the root_driver node
  const byId = new Map(chain.nodes.map((n) => [n.id, n]));
  const outgoing = new Map<string, string>();
  for (const e of chain.edges) if (!outgoing.has(e.from)) outgoing.set(e.from, e.to);
  const root =
    chain.nodes.find((n) => n.role === "root_driver") ?? chain.nodes[0];
  const order: string[] = [];
  let cur: string | undefined = root.id;
  const seen = new Set<string>();
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const n = byId.get(cur);
    if (n) order.push(n.signal_key);
    cur = outgoing.get(cur);
  }
  return order;
}

function rootOf(chain: InsightChain): string {
  const r = chain.nodes.find((n) => n.role === "root_driver");
  return r?.signal_key ?? chain.nodes[0]?.signal_key ?? "?";
}

async function main() {
  const sb = admin();
  const userId = await ensureDemoUser(sb);
  let pass = 0;
  const results: { act: string; ok: boolean; notes: string[] }[] = [];

  for (const act of ACTS) {
    console.log("\n" + "=".repeat(72));
    console.log(act.name);
    console.log("Q:", act.question);
    await act.setup(sb, userId);

    const [signals, interventions, cyclePhase] = await Promise.all([
      getSignals(sb, userId),
      getInterventions(sb, userId),
      getCurrentCyclePhase(sb, userId),
    ]);
    const packet = assembleEvidence({
      question: act.question,
      signals,
      interventions,
      cyclePhase,
    });
    const insight: Insight = await runInsight(packet);

    const root = rootOf(insight.primary_chain);
    const chain = orderChain(insight.primary_chain);
    const priorIds = insight.primary_chain.edges.map((e) => e.prior_id);

    console.log("Root driver:", root);
    console.log("Chain:", chain.join(" -> "));
    console.log("Edge priors:", priorIds.join(", "));
    console.log("Action:", insight.highest_impact_action.title,
      `(requires_clinician=${insight.highest_impact_action.requires_clinician})`);
    console.log("Secondary:", (insight.secondary_chains ?? []).map((c) => c.summary).join(" | ") || "(none)");

    const notes: string[] = [];
    const rootOk = act.expectRoot.includes(root);
    if (!rootOk) notes.push(`root=${root}, expected one of ${act.expectRoot.join("/")}`);
    const priorsPresent = act.expectPriors.filter((p) => priorIds.includes(p));
    const priorsOk = priorsPresent.length >= 2; // tolerate one substitution
    if (!priorsOk) notes.push(`priors ${priorsPresent.join(",") || "none"} of ${act.expectPriors.join(",")}`);

    const ok = rootOk && priorsOk;
    if (ok) pass++;
    console.log(ok ? "PASS" : "FAIL", notes.length ? ": " + notes.join("; ") : "");
    results.push({ act: act.name, ok, notes });

    if (PRECACHE) {
      const cacheKey = buildCacheKey(act.question, {
        hasBloodwork: signals.some((s) => s.source === "bloodwork_pdf"),
        hasGlp1: interventions.some((i) => i.key === "glp1"),
      });
      await persistInsight(sb, userId, insight, { cacheKey });
      console.log("cached as:", cacheKey);
    }
  }

  console.log("\n" + "=".repeat(72));
  console.log(`SANITY: ${pass}/${ACTS.length} acts passed.`);

  if (PRECACHE) {
    // leave the DB in the clean demo-start state (no bloodwork, no GLP-1)
    await removeBiomarkers(sb, userId);
    await removeGlp1(sb, userId);
    console.log("Reset demo state to clean start (cached answers retained).");
  }

  if (pass < ACTS.length) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
