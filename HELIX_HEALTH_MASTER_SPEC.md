# Helix Health — Master Specification

**Author:** CTO / Principal Product & Systems Architect
**Audience:** Cursor Agent (implementation), hackathon judges (strategy)
**Scope:** 24-hour Cursor hackathon MVP
**Stack:** Next.js 15 · React · TypeScript · Tailwind · Supabase · Claude API · Vercel

---

## 0. The One Decision That Defines This Build

> **Helix is not a data-integration project. It is a reasoning demo.**

The losing version of this hackathon project spends 20 hours wiring up Apple Health, Oura, and WHOOP OAuth and has nothing intelligent to show. The winning version spends 20 hours making Claude produce *genuinely insightful root-cause reasoning over a believable health dataset*, beautifully visualized.

**Therefore the single most important architectural call: do not integrate real wearable APIs during the hackathon.** Use pre-seeded, realistic synthetic data + a bloodwork PDF upload (the one integration with high wow-to-effort ratio). Every hour saved on plumbing goes into the insight engine and the visualization. This decision cascades through every section below.

---

## 1. Product Vision

Helix Health is a **health intelligence layer** that sits above a person's fragmented health data and answers the question every dashboard ignores: **"Why?"**

Wearables, labs, and trackers are excellent at *measurement* and useless at *meaning*. A user sees their HRV dropped, their weight stalled, their afternoons collapsed into fog — but the *why* is buried across five apps that don't talk to each other. Helix connects those signals into a single causal model and tells the user the most likely chain of drivers behind what they feel, plus the one action most likely to change it.

The primary output is **understanding**, delivered as a *causal narrative + a relationship map + a single prioritized action* — not another chart wall.

**Positioning line:** Every health app shows you *what*. Helix shows you *why*.

---

## 2. Problem Statement

1. **Fragmentation.** Health data lives in silos (Oura ≠ MyFitnessPal ≠ lab portal ≠ a notes app of symptoms). No one sees the whole picture, including the user.
2. **Correlation without causation.** Dashboards display metrics side by side and leave the user to guess at relationships they're not equipped to infer.
3. **No prioritization.** Even health-literate users face a wall of "optimizations" with no sense of which one actually matters *for them, right now*.
4. **The meaningful questions are causal and personal** ("why am I exhausted every afternoon?") and current tools answer descriptive and generic ("here is your average HRV").

Helix exists to close the gap between *measurement* and *meaning*.

---

## 3. Target Users

**Primary (demo persona): the Quantified Striver.** 28–45, already wears an Oura/WHOOP, gets annual bloodwork, takes supplements, tracks workouts, and is frustrated that more data hasn't produced more clarity. Health-engaged, not health-anxious. This is who we build and demo for.

**Secondary:** people navigating a specific change — started a GLP-1, new training block, perimenopause, a stubborn symptom — who need to understand what their intervention is actually doing downstream.

**Explicitly out of scope for MVP:** clinical/patient populations, anyone seeking diagnosis or treatment. Helix is a *wellness understanding* tool, not a medical device. (See §7 guardrails.)

---

## 4. Core User Journeys

**J1 — Ask Why (the hero journey).**
User lands on a populated dashboard → types or taps a question ("Why am I exhausted every afternoon?") → Helix returns a **causal chain**, an **animated relationship map**, supporting evidence from their own data, and **one highest-impact action**. This is the journey the entire demo rides on.

**J2 — Upload Bloodwork.**
User drags a lab PDF → Helix extracts biomarkers → flags out-of-range markers → folds them into the causal model (e.g., low ferritin now appears as a node in fatigue chains). This is the "it read my labs" wow moment.

**J3 — Log an Intervention.**
User adds "Started GLP-1 four weeks ago" → Helix re-reasons and shows the intervention's downstream cascade (appetite ↓ → protein ↓ → recovery ↓ → fatigue). Demonstrates that Helix models *change over time*, not just a snapshot.

**J4 — Daily Briefing (lightweight).**
On load, Helix shows a one-paragraph "what's driving you this week" summary + top action. Gives the dashboard immediate intelligence before the user asks anything.

---

## 5. Health Intelligence Framework

Helix reasons over a **typed signal graph**. Every piece of health data is normalized into a common shape so Claude can reason across modalities uniformly.

**Signal types (nodes):**
- **Inputs/behaviors:** sleep duration & consistency, activity load, nutrition (esp. protein, calories), supplements/medications/interventions.
- **Physiology:** HRV, resting HR, recovery score, sleep stages.
- **Biomarkers:** ferritin, vitamin D, TSH, fasting glucose, hs-CRP, testosterone, etc.
- **Outcomes/symptoms:** fatigue, brain fog, mood, cravings, weight trend, workout performance, recovery trend.
- **Context/modifiers:** menstrual cycle phase, stress, travel, illness.

**Each signal carries:** value, unit, timestamp/window, direction of recent change (↑/↓/flat), and a normalized status (in-range / out-of-range / trending). This normalization is what lets Claude treat a lab value and a wearable metric as comparable evidence.

**Relationships (edges):** directional, typed `drives / reduces / increases / modulates`, each with a plausibility weight and a short mechanism rationale. Edges come from two sources:
1. A small **curated knowledge base** of well-established physiological relationships (the "priors" — see §6).
2. **Claude's reasoning** linking the user's *specific* concurrent signals into a chain.

The framework's job: turn a pile of metrics into a **directed causal graph** that can be queried, explained, and drawn.

---

## 6. Root Cause Engine Design

The engine answers "why X?" by finding the most plausible **causal chain** from root drivers to the outcome, grounded in the user's actual data.

**Architecture: Retrieval-grounded reasoning (priors + evidence → Claude).**

1. **Curated priors (the moat that makes it credible).** Hand-author ~30–50 canonical health relationships as structured data — the building blocks behind the examples in the brief (poor sleep consistency → reduced recovery; low ferritin → reduced energy; late luteal → reduced sleep quality; GLP-1 → reduced appetite → lower protein → reduced recovery, etc.). Each prior = {cause, effect, mechanism, typical evidence signals, confidence}. This keeps Claude *anchored to real physiology* instead of hallucinating mechanisms.

2. **Evidence assembly.** For a given question, gather the user's relevant signals: recent values, trends, out-of-range markers, active interventions, cycle phase.

3. **Claude reasoning pass.** Claude receives: the question + the user's evidence + the relevant priors, and is instructed to produce a **ranked set of candidate causal chains**, each with: the chain (ordered nodes/edges), a confidence score, the *specific user evidence* supporting each link, and a plain-language explanation. Structured JSON output (tool/schema-forced).

4. **Ranking & selection.** Rank chains by (prior plausibility × strength of user evidence × recency of change). Surface the top chain prominently; offer 1–2 alternates as "other possible contributors."

**Why this design wins:** it produces output that feels *intelligent and personalized* (Claude's narrative + the user's own numbers) while staying *grounded and defensible* (curated priors prevent nonsense). Perceived intelligence is the scoring axis; this maximizes it per hour spent.

---

## 7. Highest-Impact Action Framework

Helix recommends **one** next action (not a list — prioritization is the product).

**Scoring each candidate action on three axes:**
- **Leverage** — how many downstream nodes it influences / how central it is in the causal chain (a root driver beats a leaf symptom).
- **Confidence** — strength of the evidence that this driver is actually active for *this* user.
- **Effort/feasibility** — favor low-friction behavioral changes the user controls (sleep timing, protein target, supplement timing) over hard ones.

`impact = leverage × confidence × feasibility` → pick the max, present it as **"Your highest-impact action right now."**

**Medical-advice guardrails (non-negotiable, baked into every prompt and the UI):**
- Frame as **lifestyle/behavioral experiments and questions to explore**, never prescriptions. "Consider increasing protein toward ~1.6g/kg" not "take this drug."
- Never diagnose, never name a disease as a conclusion, never give dosing for medications, never tell someone to start/stop a medication. For anything clinical → "discuss with your physician."
- Persistent, visible disclaimer: *"Helix provides health understanding, not medical advice."*
- System prompt hard constraints + an output schema field `requires_clinician: boolean` that routes borderline items to a "discuss with your doctor" treatment.

---

## 8. MVP Scope

**Build only what serves the §0 thesis: believable data in → brilliant reasoning out → beautifully drawn.**

### Must Have (the demo cannot exist without these)
- One seeded demo user with a rich, realistic, internally-consistent ~60–90 day dataset across all signal types (the demo's foundation — invest here).
- Populated **dashboard** with a daily-briefing summary + key signal tiles.
- **"Ask Why" query interface** (typed question + a few suggested-question chips).
- **Root Cause Engine** (priors + Claude) returning a ranked causal chain with evidence.
- **Relationship map visualization** of the causal chain (the centerpiece — see §18).
- **Highest-impact action** card.
- Medical-advice guardrails + disclaimer.
- Supabase auth (email magic link) + one persisted demo account.

### Should Have (strong wow-multipliers if time allows)
- **Bloodwork PDF upload → biomarker extraction** via Claude (high wow, contained scope).
- **Log an intervention** flow that triggers re-reasoning (powers J3 / GLP-1 story).
- Streaming Claude responses (insight "writes itself" live — great on stage).
- 2–3 pre-baked example questions with cached answers as a demo safety net.

### Nice to Have (only if comfortably ahead)
- Symptom logging UI.
- Cycle-phase overlay as a modifier node.
- "Compare this month vs last month" narrative.
- Multiple saved insights / history.

### Explicitly NOT in scope (cut without guilt)
- Real Apple Health / Oura / WHOOP API integrations and OAuth.
- Real-time sync, background jobs, webhooks.
- Multi-user data isolation hardening beyond basic RLS.
- Mobile app, notifications, any payment.

---

## 9. Information Architecture

Keep it to **four surfaces.** Fewer screens = more polish per screen.

1. **/login** — magic-link auth (or "Enter Demo" button straight to the seeded account).
2. **/dashboard** (home) — daily briefing summary, signal tiles, the prominent **Ask Why** bar, suggested-question chips, "Add data" entry point.
3. **/insight** (or a full-screen modal/route over dashboard) — the hero result: causal narrative + **relationship map** + highest-impact action + supporting evidence. This is where the demo lives.
4. **/data** — lightweight: drag-drop bloodwork upload, "log intervention" form, list of known signals. Optional if time-constrained; can be a slide-over panel instead of a page.

Navigation: a minimal left rail or top bar (Dashboard · Data) — nothing more.

---

## 10. UX Flow (onboarding → insight)

1. **Land → "Enter Demo"** (skip real onboarding for the hackathon; one click into the populated account — judges should never watch an empty-state setup).
2. **Dashboard loads** already populated, with the daily briefing visible immediately ("intelligent on arrival").
3. **User asks a question** (types or taps a chip).
4. **Insight view animates in:** Claude's narrative streams in while the **relationship map draws itself node-by-node**, links highlighting along the causal path. (This is the signature moment.)
5. **Highest-impact action** card resolves at the end with a confidence indicator.
6. **(Optional) Upload bloodwork or log intervention →** dashboard updates → ask again → answer visibly changes. Demonstrates the system *reasoning over new evidence*.

Design language: calm, clinical-premium, lots of whitespace, one accent color, smooth motion. Think "Apple Health meets a sharp analyst," not "WebMD."

---

## 11. Unified Health Intelligence Architecture

The core abstraction is the **Signal** and the **Relationship**, giving every modality one shape:

```
Signal {
  id, user_id,
  type,            // sleep | hrv | recovery | nutrition | biomarker | symptom | intervention | cycle | activity ...
  name,            // "Ferritin", "Sleep Consistency", "Afternoon Fatigue"
  value, unit,
  window,          // point-in-time or date range
  status,          // in_range | low | high | trending_down | trending_up | flat
  direction,       // recent change
  source           // seeded | bloodwork_pdf | manual_log
}

Relationship (edge) {
  from_signal, to_signal,
  type,            // drives | reduces | increases | modulates
  weight,          // plausibility 0–1
  mechanism,       // short rationale
  origin           // prior | inferred
}
```

The **causal graph** for any question = relevant Signals (nodes) + the priors and Claude-inferred edges connecting them. Normalizing everything into Signals is what lets Claude reason across wearables, labs, and symptoms as a single fabric — and lets the visualization render any modality with one component.

---

## 12. Data Architecture

**Entities:**
- `users` (Supabase Auth)
- `signals` — the universal normalized health datapoints (per §11), the demo dataset lives here.
- `relationships` / `priors` — curated knowledge base of canonical edges (seeded, mostly read-only).
- `interventions` — user-logged changes (supplements, meds, lifestyle) with start dates.
- `biomarkers` — extracted lab results (could be rows in `signals` with type=biomarker, or a dedicated table feeding `signals`).
- `insights` — persisted Claude outputs: question, resulting causal chain (JSON), narrative, recommended action, confidence, timestamp. (Enables caching + history + the demo safety net.)
- `documents` — uploaded bloodwork PDFs (Supabase Storage refs).

**Data flow:**
`seed/upload → signals (normalized) → [question] → assemble evidence + priors → Claude → insight (causal chain JSON) → persist + render map`.

Keep biomarkers-as-signals if pressed for time (one fewer table). Favor JSON columns for the causal-chain payload so the graph shape can evolve without migrations.

---

## 13. Supabase Architecture

**Tables (minimum viable):** `signals`, `priors`, `interventions`, `insights`, `documents`. Optional `biomarkers` (else fold into `signals`).

**Auth:** Supabase Auth, email magic link. Provide a one-click "Enter Demo" that signs into a pre-provisioned demo user — judges must not type credentials.

**Storage:** one bucket `bloodwork` for uploaded PDFs.

**RLS:** enable with simple `user_id = auth.uid()` policies. `priors` table is shared/read-only. Don't over-engineer multi-tenant isolation — it's a single demo account.

**Seeding:** a seed script populates the demo user's `signals` (60–90 days, internally consistent so the causal stories actually hold up) and the `priors` knowledge base. **This seed data is the most important asset in the build** — the reasoning is only as good as the data it reasons over. Make the demo user's data tell *deliberate* stories (e.g., a sleep-consistency dip three weeks ago that propagates to recovery and afternoon fatigue; a GLP-1 start that drops protein).

---

## 14. API Architecture

**Pattern:** Next.js 15 App Router. Use **Route Handlers / Server Actions** as a thin backend; **all Claude calls happen server-side** (API key never touches the client).

**Key endpoints/actions:**
- `POST /api/insight` — body: `{question}`. Server assembles evidence + priors → calls Claude → returns/persists structured causal chain. **Stream** the narrative; return the graph JSON.
- `POST /api/bloodwork` — upload PDF → Claude extraction → normalize into `signals`.
- `POST /api/intervention` — log intervention → invalidate/refresh relevant insights.
- `GET /api/briefing` — daily summary (can be generated once and cached on `insights`).

**Claude integration:** Anthropic SDK server-side. Use **structured/tool-forced output** for the causal-chain JSON (reliable rendering), **streaming** for the human-readable narrative, and **prompt caching** on the static system prompt + priors block (faster, cheaper, smoother on stage). Latest models: default to `claude-opus-4-8` for the headline reasoning; `claude-haiku-4-5` is fine for extraction/summary if you want speed.

*(Vercel AI Gateway with `"anthropic/claude-opus-4-8"` strings is a reasonable alternative for observability/fallback, but direct Anthropic SDK is the simplest path for a hackathon — pick one and move on.)*

---

## 15. Integration Architecture (with hackathon simplifications)

| Source | Real integration | **Hackathon MVP recommendation** |
|---|---|---|
| Apple Health / Oura / WHOOP | OAuth + sync APIs (hours of plumbing, fragile demos) | **Skip. Pre-seed realistic synthetic data** in `signals`. Optionally show greyed-out "Connect Oura/WHOOP" buttons as future-vision UI. |
| Bloodwork | Lab PDF parsing | **Build this** — drag-drop PDF → **Claude extracts biomarkers** (vision/document input). Best wow-to-effort ratio of any integration. |
| Nutrition/Exercise/Sleep | Third-party APIs | **Seeded data** + optional manual log. |
| Symptoms | — | Simple manual log form (Should/Nice to Have). |
| Interventions | — | Simple log form (drives the GLP-1 story — worth building). |
| Cycle tracking | — | Seeded cycle phases as modifier signals; additive, not central. |

**Rule:** the only integration worth real engineering time is **bloodwork PDF extraction**, because it's self-contained, reliably demoable, and genuinely impressive ("it read my labs and connected them to my fatigue").

---

## 16. AI Insight Engine

Claude is the reasoning core. Four jobs, all server-side, all grounded in the user's `signals` + curated `priors`:

1. **Root-cause insights** — given a question + evidence + priors, return ranked causal chains with per-link evidence and confidence (structured JSON). The headline capability.
2. **Relationship maps** — the same structured output *is* the graph; the engine emits nodes+edges the visualization renders directly (no separate call).
3. **Health summaries** — the daily briefing: a concise "what's driving you this week + why" paragraph.
4. **Highest-impact action** — applying §7 scoring; Claude proposes candidates, returns the top one with rationale and a `requires_clinician` flag.
5. **Bloodwork interpretation** — extract markers from PDF, flag out-of-range, normalize into signals, and *contextualize* (low ferritin → links into fatigue chains).

**Prompt design principles:**
- System prompt encodes Helix's role, the guardrails (§7), and the priors block — **prompt-cache this.**
- User turn = the question + a compact, structured evidence packet (not raw rows — pre-summarized signals with values, trends, statuses).
- **Force structured output** for anything that renders (causal chain, action, extracted biomarkers); **stream** the narrative prose.
- Always require Claude to cite *the user's specific evidence* for each causal link — this is what makes it feel personalized and trustworthy rather than generic.

---

## 17. Dashboard Architecture

The dashboard must look **intelligent the instant it loads** — never an empty state in front of judges.

- **Daily Briefing** (top): one-paragraph Claude summary of what's driving the user this week + the current top action. Generated/cached on load.
- **Signal tiles:** a tidy grid of key metrics (sleep consistency, recovery, HRV, protein, weight trend, a flagged biomarker) each with value + trend arrow + status color. *Read at a glance, not a chart wall.*
- **Ask Why bar** (prominent, center): freeform input + 4 suggested-question chips drawn straight from the core user questions ("Why am I exhausted every afternoon?").
- **Add data** affordance: bloodwork upload / log intervention.
- Asking a question transitions to the **Insight view** (§18) — the real star.

---

## 18. Relationship Visualization System

**This is the single highest-leverage visual in the product. Get it right and the demo wins.**

**Recommendation: an animated, directed causal-chain graph.** Not a generic force-directed hairball — a **curated, left-to-right (or top-down) causal flow** from root drivers → intermediate physiology → the outcome the user asked about.

- **Nodes** = signals, color-coded by type (behavior / physiology / biomarker / symptom / intervention), showing name + value + trend.
- **Edges** = directional arrows with the relationship type, animated to "flow" along the causal path; thickness/opacity = confidence.
- **The asked-about outcome is highlighted** as the terminus; the **highest-impact action attaches to the root node** with a glow ("change this here → cascade improves downstream").
- **Signature animation:** on answer, the graph **draws itself** — nodes appear and edges connect along the causal chain in sequence while the narrative streams alongside. This is the "wow."

**Implementation guidance for Cursor:** React Flow (or a lightweight SVG/D3 layout) renders the Claude-emitted nodes+edges JSON directly. Since the layout is a curated chain (not arbitrary topology), a simple layered/dagre layout is enough — avoid heavy graph engines. Keep it smooth at 60fps; motion sells intelligence more than density does.

**Fallback if time-constrained:** a vertical "causal cascade" of connected cards with animated connecting lines achieves 80% of the impact at 30% of the effort. Build this first; upgrade to the graph if ahead.

---

## 19. Demo Script (3–5 minutes)

**Setup (15s).** "Everyone here wears a tracker and gets bloodwork. So why are we still tired and confused? Every app shows you *what's* happening. Helix shows you *why*." Land on the populated dashboard.

**Act 1 — Ask Why (the hook, ~75s).**
- Click the suggested chip: **"Why am I exhausted every afternoon?"**
- Narrative streams in *as the causal map draws itself*: Poor Sleep Consistency → Reduced Recovery → Reduced Activity → Afternoon Fatigue — each link annotated with the user's own numbers ("your sleep timing varied by 2.5h over the last 3 weeks; recovery fell 18%").
- The **highest-impact action** resolves: *"Stabilize your sleep window — it's the root driver feeding three downstream effects."* with a confidence indicator.
- **Wow moment:** the graph animating into a coherent causal story from scattered metrics.

**Act 2 — It reads your labs (~60s).**
- Drag in a **bloodwork PDF.** Watch Claude extract biomarkers; **low ferritin** flags red.
- Ask: **"Why is my recovery declining?"** Now the answer *incorporates ferritin*: Low Ferritin → Reduced Energy → Reduced Exercise Capacity → Recovery Decline.
- **Wow moment:** Helix fused a lab PDF with wearable data into one explanation no single app could give.

**Act 3 — It reasons about change (~60s).**
- Log intervention: **"Started GLP-1, 4 weeks ago."**
- Ask: **"Why is my recovery worse this month?"** → GLP-1 → Reduced Appetite → Lower Protein Intake → Reduced Recovery → Fatigue. Action: *"Prioritize protein toward ~1.6g/kg while on a GLP-1."* (with "discuss with your physician" framing).
- **Wow moment:** Helix understands the *downstream cascade of a medication* over time — true intelligence, not a dashboard.

**Close (20s).** "Same data everyone already has — but Helix turns measurement into meaning, and meaning into the one action that matters. *Every app shows you what. Helix shows you why.*"

*Safety nets: pre-cache these exact question answers; have a "Enter Demo" one-click login; rehearse offline-capable fallbacks.*

---

## 20. Judge Pitch

**One-liner:**
> "Every health app shows you *what's* happening. Helix shows you *why* — and the one thing to do about it."

**30-second:**
> "People drown in health data — wearables, labs, symptoms — all in separate apps, none of it explaining anything. Helix is an AI health-intelligence layer that connects all of it into a single causal model. Ask it 'why am I exhausted every afternoon?' and it traces the actual chain of drivers across your sleep, recovery, nutrition, and bloodwork — then tells you the single highest-impact action to take. Powered by Claude, built on Next.js and Supabase. It turns measurement into understanding."

**2-minute:**
> Open with the problem: we have more health data than ever and less understanding than ever, because data lives in silos and dashboards only describe — they never explain. The questions people actually ask are causal ("why is my recovery declining?") and the tools only answer descriptive ("here's your HRV"). → Helix is the intelligence layer that closes that gap: it normalizes every signal — wearables, labs, symptoms, interventions, cycle — into one fabric, then uses Claude, grounded in a curated knowledge base of physiological relationships, to find the most plausible causal chain behind any question, cite the user's own data for every link, and prioritize one highest-impact action. → Demo the three acts: ask-why, bloodwork fusion, GLP-1 cascade. → Emphasize what's hard and what we nailed: not the plumbing, but *grounded causal reasoning that's personalized, explainable, and safe* (understanding, never diagnosis). → Close: "Helix is the layer that sits above all your health data and finally answers the only question that matters — why. Every app shows you what. Helix shows you why."

---

## 21. Future Vision (post-hackathon — clearly separated from MVP)

- **Real integrations:** Apple Health, Oura, WHOOP, CGM, lab providers via API — continuous live signal ingestion.
- **Longitudinal causal modeling:** detect drivers automatically over time, alert on emerging cascades before the user feels them.
- **Personalized priors:** learn each user's individual response patterns (their ferritin-to-energy curve), moving from population priors to a personal model.
- **Experiment loop:** propose an action, track the downstream signals, and report back whether it worked — closing the understand→act→verify loop.
- **Clinician collaboration mode:** shareable causal reports a doctor can act on (Helix as the prep layer for appointments).
- **Proactive intelligence:** "your sleep consistency is slipping — here's the cascade it'll cause in two weeks if it continues."
- **Broader modalities:** CGM, genetics, microbiome, mental-health signals folded into the same unified graph.

The MVP proves the **reasoning + visualization core**. The future is breadth of data, continuity over time, and personalization of the model — but the defensible thing, the thing worth building first, is the intelligence layer itself.

---

## Appendix — Build Order for Cursor Agent (24h critical path)

1. **Scaffold** Next.js 15 + Tailwind + Supabase + Anthropic SDK; deploy to Vercel early (deploy on hour 1, not hour 23).
2. **Seed the demo dataset + priors** — the foundation; make the data tell deliberate causal stories.
3. **Insight engine** — `/api/insight`: evidence assembly + priors + Claude structured output. Get *one* question returning a correct causal-chain JSON.
4. **Relationship visualization** — render that JSON as the animated causal chain (start with the card-cascade fallback, upgrade if ahead).
5. **Dashboard** — daily briefing + tiles + Ask Why bar wired to the engine.
6. **Highest-impact action** card + guardrails/disclaimer.
7. **Bloodwork PDF upload + extraction** (Should Have — high wow).
8. **Log intervention + re-reason** (Should Have — powers Act 3).
9. **Polish, streaming, pre-cache demo answers, rehearse.**

**Guiding principle throughout:** every hour goes to *believable data → brilliant reasoning → beautiful map*. Cut anything that doesn't serve that chain.
