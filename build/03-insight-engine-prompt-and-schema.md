# Helix Health — Insight Engine: System Prompt, Evidence Packet & Output Schema

**Purpose:** The exact prompt and I/O contracts for the Root Cause Engine. Cursor wires these into the server-side `/api/insight` route. The narrative streams; the structured causal chain is tool-forced JSON that drives the relationship visualization.

**Model:** `claude-opus-4-8` for headline reasoning. Prompt-cache the system prompt + priors block (static across requests). Use streaming for the narrative; use a forced tool call for the structured payload.

**Recommended call shape:** two outputs from one reasoning turn —
1. a **forced tool call** `emit_insight` whose input matches the JSON schema below (the graph + action), and
2. a streamed **narrative** for the user. (Simplest reliable approach: ask for the tool call, then render `narrative` from inside the structured payload. If you want true token streaming of prose, do a second lightweight streamed call that narrates the already-computed chain. For a hackathon, the single forced-tool-call approach is fine and most reliable.)

---

## 1. System prompt (cache this block)

```
You are the reasoning engine for Helix Health, a health-intelligence platform.

Your job: given a user's question and a structured packet of their health data,
identify the MOST PLAUSIBLE CAUSAL CHAIN(S) explaining their outcome, grounded in
both (a) the curated physiological priors provided and (b) the user's specific data.
Then identify the single HIGHEST-IMPACT ACTION they can take.

Helix provides health UNDERSTANDING, not medical advice. You explain WHY, you do not
diagnose or prescribe.

# How to reason
1. Read the user's question and identify the target outcome signal (e.g. afternoon_fatigue,
   recovery_score, weight_trend).
2. From the provided PRIORS, select the relationships whose effects lead toward that outcome
   and whose causes are supported by the user's EVIDENCE.
3. Assemble one or more ordered causal chains from root driver(s) -> ... -> outcome.
   Prefer chains where each link is corroborated by a real, recently-changed signal in the
   evidence. A link with no supporting evidence is weak.
4. Rank chains. A chain's strength = (product of prior confidences) x (strength and recency
   of the user's supporting evidence). Surface ONE primary chain and up to TWO secondary
   contributors.
5. Pick the highest-impact action by scoring candidate root drivers on:
   - leverage: how many downstream nodes it influences (upstream root > leaf),
   - confidence: how strongly the user's data supports that driver being active,
   - feasibility: prefer low-friction behavioral changes the user controls.
   Choose the single best one.

# Grounding rules
- Cite the user's SPECIFIC evidence for every causal link (actual values, trends, dates).
  Never assert a link you cannot tie to their data or a provided prior.
- Only use signals present in the evidence packet. Do not invent data.
- Use the provided priors as your mechanism source. You may combine them into chains; do not
  fabricate mechanisms outside them unless trivially physiological and clearly labeled lower
  confidence.

# Safety rules (HARD constraints)
- Never diagnose a disease or name a condition as a conclusion.
- Never give medication dosing, and never tell the user to start or stop any medication.
- Frame all actions as lifestyle/behavioral experiments or questions to explore, not
  prescriptions ("consider...", "you might experiment with...").
- If a chain or action involves biomarkers, medications, or anything clinical, set
  requires_clinician = true for that item and phrase the action as "discuss with your
  physician."
- Always remain within wellness understanding. When uncertain, lower confidence rather than
  overstate.

# Output
Call the emit_insight tool with the structured causal chain(s), evidence-cited links,
the single highest-impact action, and a clear, warm, plain-language narrative. The narrative
should read like a sharp, caring analyst explaining what's going on — concrete, specific to
this user's numbers, never generic.

# PRIORS (your mechanism knowledge base)
<inject the priors knowledge base here as JSON — id, cause, effect, type, mechanism, confidence, requires_clinician>
```

---

## 2. User-turn evidence packet (what the engine assembles per request)

Send a **compact, pre-summarized** packet — NOT raw daily rows. The server computes recent value, baseline, trend, and status for each relevant signal before calling Claude.

```json
{
  "question": "Why am I exhausted every afternoon?",
  "as_of_date": "2026-06-04",
  "user_context": {
    "menstruates": true,
    "current_cycle_phase": "late_luteal"
  },
  "active_interventions": [
    { "key": "glp1", "name": "Semaglutide (GLP-1)", "started": "2026-05-07", "weeks_active": 4 }
  ],
  "signals": [
    {
      "key": "sleep_consistency", "name": "Sleep Consistency",
      "type": "sleep", "unit": "score",
      "recent_value": 58, "baseline": 82,
      "trend": "down", "change_started": "2026-05-14",
      "status": "trending_down", "pct_change": -29
    },
    {
      "key": "recovery_score", "name": "Recovery",
      "type": "recovery", "unit": "score",
      "recent_value": 58, "baseline": 78,
      "trend": "down", "change_started": "2026-05-16",
      "status": "trending_down", "pct_change": -26
    },
    {
      "key": "afternoon_fatigue", "name": "Afternoon Fatigue",
      "type": "symptom", "unit": "0-10",
      "recent_value": 7, "baseline": 3,
      "trend": "up", "change_started": "2026-05-15",
      "status": "trending_up", "pct_change": 133
    }
    // ... include all signals relevant to the question's outcome + any out-of-range biomarkers
    // ... include extracted biomarkers (e.g. ferritin: 18, status "low") once bloodwork uploaded
  ]
}
```

**Server-side selection rule:** include (a) the outcome signal named/implied by the question, (b) any signal that appears as `cause` or `effect` in a prior leading to that outcome, (c) all out-of-range biomarkers, (d) all active interventions. Keep the packet under ~30 signals.

---

## 3. Output JSON schema (`emit_insight` tool input)

```json
{
  "name": "emit_insight",
  "description": "Emit the structured root-cause insight for rendering.",
  "input_schema": {
    "type": "object",
    "required": ["question", "primary_chain", "highest_impact_action", "narrative", "disclaimer"],
    "properties": {
      "question": { "type": "string" },

      "primary_chain": { "$ref": "#/$defs/chain" },

      "secondary_chains": {
        "type": "array",
        "maxItems": 2,
        "items": { "$ref": "#/$defs/chain" },
        "description": "Other plausible contributors, ranked. May be empty."
      },

      "highest_impact_action": {
        "type": "object",
        "required": ["title", "rationale", "target_signal", "leverage", "confidence", "feasibility", "requires_clinician"],
        "properties": {
          "title": { "type": "string", "description": "Imperative, behavioral, non-prescriptive. e.g. 'Stabilize your sleep window'." },
          "rationale": { "type": "string", "description": "Why this is highest-impact, citing the user's evidence and downstream cascade." },
          "target_signal": { "type": "string", "description": "signal key of the root driver this action addresses" },
          "leverage": { "type": "number", "minimum": 0, "maximum": 1 },
          "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
          "feasibility": { "type": "number", "minimum": 0, "maximum": 1 },
          "requires_clinician": { "type": "boolean" }
        }
      },

      "narrative": {
        "type": "string",
        "description": "Warm, specific, plain-language explanation citing the user's actual numbers. 3-6 sentences. This is the streamed/displayed prose."
      },

      "confidence_overall": { "type": "number", "minimum": 0, "maximum": 1 },

      "disclaimer": {
        "type": "string",
        "description": "Always: 'Helix provides health understanding, not medical advice.'"
      }
    },

    "$defs": {
      "chain": {
        "type": "object",
        "required": ["summary", "confidence", "nodes", "edges"],
        "properties": {
          "summary": { "type": "string", "description": "One-line plain-language version of this chain." },
          "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
          "nodes": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["id", "signal_key", "label", "type", "role"],
              "properties": {
                "id": { "type": "string", "description": "unique within this chain, e.g. 'n1'" },
                "signal_key": { "type": "string" },
                "label": { "type": "string", "description": "display name, e.g. 'Sleep Consistency'" },
                "type": { "enum": ["sleep","recovery","nutrition","biomarker","activity","intervention","cycle","symptom","physiology"] },
                "role": { "enum": ["root_driver","mediator","outcome","modifier"] },
                "value": { "type": ["string","number","null"], "description": "current value to show on the node" },
                "trend": { "enum": ["up","down","flat", null] },
                "status": { "enum": ["in_range","low","high","trending_up","trending_down","flat", null] }
              }
            }
          },
          "edges": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["from", "to", "type", "confidence", "evidence", "prior_id"],
              "properties": {
                "from": { "type": "string", "description": "node id" },
                "to": { "type": "string", "description": "node id" },
                "type": { "enum": ["drives","reduces","increases","modulates"] },
                "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
                "evidence": { "type": "string", "description": "the user's SPECIFIC data supporting this link, e.g. 'Sleep timing varied 2.5h/night since May 14; deep sleep down 22%.'" },
                "mechanism": { "type": "string", "description": "plain-language mechanism (from the prior)" },
                "prior_id": { "type": ["string","null"], "description": "id of the prior backing this edge, or null if inferred" }
              }
            }
          }
        }
      }
    }
  }
}
```

---

## 4. Example output (Act 1 — abbreviated, for verification)

```json
{
  "question": "Why am I exhausted every afternoon?",
  "primary_chain": {
    "summary": "Inconsistent sleep timing is lowering your recovery and driving afternoon fatigue.",
    "confidence": 0.81,
    "nodes": [
      { "id": "n1", "signal_key": "sleep_consistency", "label": "Sleep Consistency", "type": "sleep", "role": "root_driver", "value": 58, "trend": "down", "status": "trending_down" },
      { "id": "n2", "signal_key": "recovery_score", "label": "Recovery", "type": "recovery", "role": "mediator", "value": 58, "trend": "down", "status": "trending_down" },
      { "id": "n3", "signal_key": "activity_level", "label": "Daily Activity", "type": "activity", "role": "mediator", "value": "7,400 steps", "trend": "down", "status": "trending_down" },
      { "id": "n4", "signal_key": "afternoon_fatigue", "label": "Afternoon Fatigue", "type": "symptom", "role": "outcome", "value": 7, "trend": "up", "status": "trending_up" }
    ],
    "edges": [
      { "from": "n1", "to": "n2", "type": "reduces", "confidence": 0.8, "evidence": "Bedtime varied 2.5h/night since May 14; deep sleep down 22% and HRV down from 62 to 51ms.", "mechanism": "Irregular sleep timing disrupts circadian rhythm and autonomic recovery.", "prior_id": "P01" },
      { "from": "n1", "to": "n4", "type": "drives", "confidence": 0.7, "evidence": "Afternoon fatigue rose from 3 to 7, tracking the same 3-week window your sleep timing destabilized.", "mechanism": "Circadian misalignment surfaces as predictable afternoon energy crashes.", "prior_id": "P05" },
      { "from": "n2", "to": "n3", "type": "drives", "confidence": 0.72, "evidence": "Steps fell from 9,200 to 7,400 as recovery dropped to 58.", "mechanism": "Low recovery reduces readiness, so daily activity falls.", "prior_id": "P03" }
    ]
  },
  "secondary_chains": [
    {
      "summary": "Your GLP-1 has lowered protein intake, which may also be reducing recovery.",
      "confidence": 0.55,
      "nodes": [ "...glp1 -> protein_intake -> recovery_score..." ],
      "edges": [ "..." ]
    }
  ],
  "highest_impact_action": {
    "title": "Stabilize your sleep window",
    "rationale": "Sleep consistency is the single upstream driver feeding three things at once — your recovery, your activity, and your afternoon energy. Anchoring a consistent bed/wake time is the highest-leverage, lowest-friction change available to you right now.",
    "target_signal": "sleep_consistency",
    "leverage": 0.9,
    "confidence": 0.81,
    "feasibility": 0.85,
    "requires_clinician": false
  },
  "confidence_overall": 0.8,
  "narrative": "Over the last three weeks your recovery has dropped from 78 to 58 and your afternoon fatigue has more than doubled. The common thread isn't how much you're sleeping — it's when. Since May 14 your bedtime has swung by over two hours most nights, cutting your deep sleep and HRV and leaving less in the tank by mid-afternoon. Lower recovery has also quietly pulled your daily activity down, which compounds the slump. The good news: this is one upstream lever. Anchoring a consistent sleep window should lift recovery, energy, and activity together.",
  "disclaimer": "Helix provides health understanding, not medical advice."
}
```

---

## 5. Wiring checklist for Cursor
- [ ] System prompt + priors JSON sent as a **cached** system block (mark for prompt caching).
- [ ] Server assembles the evidence packet (§2) from `signals`/`interventions`/biomarkers before each call.
- [ ] Force the `emit_insight` tool call; validate against the schema; on validation failure, retry once.
- [ ] Persist the result to `insights` (question, full JSON, timestamp) — enables history + the **pre-cached demo safety net** (store the three demo answers ahead of time).
- [ ] Map the `nodes`/`edges` directly into the relationship visualization (edge `type` → styling; `confidence` → opacity/thickness; `role: root_driver` → glow + attached action).
- [ ] Render `narrative` (stream if doing a second call); show `highest_impact_action` as the action card with a confidence indicator; always show `disclaimer`.
- [ ] When `requires_clinician` is true on the action, render the "discuss with your physician" treatment.
- [ ] After bloodwork upload or intervention log, re-run `/api/insight` so the answer visibly updates on stage.
