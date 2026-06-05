# Helix Health — Cursor Kickoff

**Read this first.** It points you at the spec docs in the right order, locks the two scaffolding decisions, and gives you the 24-hour critical path. Build for one thing: **believable data in → brilliant reasoning out → beautifully drawn.** Cut anything that doesn't serve that chain.

---

## Locked decisions (do not re-litigate)

1. **AI: Anthropic SDK direct.** Use `@anthropic-ai/sdk` server-side. No Vercel AI Gateway. Model `claude-opus-4-8` for the headline reasoning; `claude-haiku-4-5` is fine for bloodwork extraction/summaries. API key stays server-side only — never in the client.

2. **Visualization: cascade-first, then upgrade to the curated graph (Option B).**
   - **Phase 1 (build first, guaranteed baseline):** a **card cascade** — a vertical stack of signal cards connected by animated lines, evidence text revealing under each link, root driver glowing, highest-impact action attached. Plain React + Tailwind + Framer Motion. No graph library. This means you are never demo-less.
   - **Phase 2 (upgrade if ahead):** a **hand-curated animated graph** — absolutely-positioned node cards + animated SVG paths (Framer Motion `pathLength` for the self-drawing effect), hand-laid-out for each of the 3–4 known demo chains. This expresses the branching/convergence the cascade can't (e.g. one driver feeding two nodes; two drivers converging on recovery).
   - **Do NOT use React Flow + dagre.** The demo chains are known, so auto-layout buys nothing while costing time and live-demo robustness.
   - **Critical:** both renderers consume the **same** `nodes`/`edges` JSON from `emit_insight`. Upgrading is swapping the renderer component, not touching the engine or data. Keep the cascade as the automatic fallback for any chain without a hand-made layout.

---

## Read the specs in this order

1. **`../HELIX_HEALTH_MASTER_SPEC.md`** — full product/systems architecture (21 sections). The "why" and the scope.
2. **`02-seed-data-story-arc.md`** — the demo persona (Jane Doe) and the engineered dataset. **The most important asset — the reasoning is only as good as this data.** Build the seed before the engine.
3. **`01-priors-knowledge-base.md`** — the 45 curated physiological relationships (P01–P45) that ground Claude. Seed verbatim. Signal keys must match the seed catalog.
4. **`03-insight-engine-prompt-and-schema.md`** — the system prompt, evidence-packet format, and `emit_insight` JSON schema. The engine contract + a worked example to test against.

---

## 24-hour critical path

> Deploy to Vercel on **hour 1**, not hour 23.

1. **Scaffold + deploy.** Next.js 15 (App Router) + TypeScript + Tailwind + Supabase + `@anthropic-ai/sdk`. Push to Vercel, confirm it's live.
2. **Supabase + auth.** Tables: `signals`, `priors`, `interventions`, `insights`, `documents`. Simple RLS (`user_id = auth.uid()`; `priors` shared read-only). Magic-link auth + a one-click **"Enter Demo"** that signs into Jane Doe's account.
3. **Seed the data** (`02-seed-data-story-arc.md`). Deterministic script, 2026-03-06 → 2026-06-04, smooth ramps at perturbation dates, ±5% noise, internally consistent. Seed the priors (`01-`). Prepare the Act 2 bloodwork PDF (real lab-style file).
4. **Insight engine** (`03-`). Server route `POST /api/insight`: assemble evidence packet → cached system prompt + priors → forced `emit_insight` tool call → validate (retry once) → persist to `insights`. Get **one** question returning a correct chain.
5. **Demo-chain test harness (do this the moment the engine returns anything).** A throwaway script/route that fires all three demo questions (+ the cycle bonus) against the engine and prints, for each: the root-driver node, the ordered chain, and the per-edge `prior_id`s. Check them against the sanity table at the bottom of this doc. This surfaces a miscalibrated seed dataset *now* — when you can still retune magnitudes — instead of during rehearsal. **The seed-tuning loop (step 3 ↔ step 5) is the highest-risk item in the build; make it a tight loop and run it early and often.** Keep the harness around to re-verify after any seed change, schema change, or prompt edit.
6. **Visualization Phase 1 — card cascade.** Render `nodes`/`edges` with the self-drawing animation. Root driver glows; action attaches.
7. **Dashboard.** Daily briefing (pre-cached) + signal tiles + the prominent **Ask Why** bar + 4 suggested-question chips. Wire chips → engine → cascade.
8. **Highest-impact action** card + persistent disclaimer + `requires_clinician` → "discuss with your physician" treatment.
9. **Bloodwork PDF upload + extraction** (Should Have, high wow). Drag-drop → Claude extracts biomarkers → normalize into `signals` → re-reason. Re-run the harness (step 5) to confirm Act 2 now surfaces ferritin.
10. **Log intervention + re-reason** (Should Have — powers Act 3 GLP-1 story). Re-run the harness to confirm Act 3 surfaces the protein cascade.
11. **Pre-cache the 3 demo answers** in `insights` as a safety net. Then **polish + rehearse** (streaming, motion, the three-act demo in `MASTER_SPEC §19`).
12. **If comfortably ahead:** Visualization Phase 2 — upgrade the hero "Ask Why" view to the curated animated graph (Option B) for the known demo chains.

---

## Guardrails (non-negotiable, baked into prompt + UI)
- Helix explains **why**; it never diagnoses, prescribes, or doses medications.
- Actions are framed as lifestyle experiments ("consider…"), never prescriptions.
- Persistent disclaimer: *"Helix provides health understanding, not medical advice."*
- Anything clinical → `requires_clinician: true` → "discuss with your physician."

## The three demo answers must come out right (sanity checks)
- **Act 1** "Why am I exhausted every afternoon?" → root driver **sleep_consistency** (P01/P05/P03).
- **Act 2** (after PDF upload) "Why is my recovery declining?" → root driver **ferritin** (P18/P19/P20).
- **Act 3** (after logging GLP-1) "Why is my recovery worse this month?" → root driver **GLP-1 → low protein** (P29/P30/P13).

Tune seed magnitudes so each act's intended root cause clearly wins *for its question*, with the others appearing as secondary contributors. Same symptoms, three distinct causal explanations — that convergence is what makes Helix look intelligent.
