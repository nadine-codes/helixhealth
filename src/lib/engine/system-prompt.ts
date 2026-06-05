import Anthropic from "@anthropic-ai/sdk";
import { priorsForPrompt } from "@/lib/priors";

export const REASONING_MODEL = "claude-opus-4-8";
export const EXTRACTION_MODEL = "claude-haiku-4-5";

// The static system prompt (cache this block). Priors are injected as JSON.
export function buildSystemBlocks(): Anthropic.Messages.TextBlockParam[] {
  const prompt = `You are the reasoning engine for Helix Health, a health-intelligence platform.

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
- The primary_chain MUST begin with the single most plausible root_driver for THIS question
  and end with the outcome the user asked about. Mark exactly one node role "root_driver" and
  exactly one node role "outcome" per chain. Every edge must reference the prior_id it came
  from when one exists.

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
this user's numbers, never generic. Always set disclaimer to exactly:
"Helix provides health understanding, not medical advice."

# PRIORS (your mechanism knowledge base)
${JSON.stringify(priorsForPrompt(), null, 0)}`;

  return [
    {
      type: "text",
      text: prompt,
      cache_control: { type: "ephemeral" },
    },
  ];
}

// The forced emit_insight tool. input_schema mirrors build/03 §3.
export const EMIT_INSIGHT_TOOL: Anthropic.Messages.Tool = {
  name: "emit_insight",
  description: "Emit the structured root-cause insight for rendering.",
  input_schema: {
    type: "object",
    required: [
      "question",
      "primary_chain",
      "highest_impact_action",
      "narrative",
      "disclaimer",
    ],
    properties: {
      question: { type: "string" },
      primary_chain: { $ref: "#/$defs/chain" },
      secondary_chains: {
        type: "array",
        maxItems: 2,
        items: { $ref: "#/$defs/chain" },
        description: "Other plausible contributors, ranked. May be empty.",
      },
      highest_impact_action: {
        type: "object",
        required: [
          "title",
          "rationale",
          "target_signal",
          "leverage",
          "confidence",
          "feasibility",
          "requires_clinician",
        ],
        properties: {
          title: {
            type: "string",
            description:
              "Imperative, behavioral, non-prescriptive. e.g. 'Stabilize your sleep window'.",
          },
          rationale: {
            type: "string",
            description:
              "Why this is highest-impact, citing the user's evidence and downstream cascade.",
          },
          target_signal: {
            type: "string",
            description: "signal key of the root driver this action addresses",
          },
          leverage: { type: "number", minimum: 0, maximum: 1 },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          feasibility: { type: "number", minimum: 0, maximum: 1 },
          requires_clinician: { type: "boolean" },
        },
      },
      narrative: {
        type: "string",
        description:
          "Warm, specific, plain-language explanation citing the user's actual numbers. 3-6 sentences.",
      },
      confidence_overall: { type: "number", minimum: 0, maximum: 1 },
      disclaimer: {
        type: "string",
        description:
          "Always: 'Helix provides health understanding, not medical advice.'",
      },
    },
    $defs: {
      chain: {
        type: "object",
        required: ["summary", "confidence", "nodes", "edges"],
        properties: {
          summary: {
            type: "string",
            description: "One-line plain-language version of this chain.",
          },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          nodes: {
            type: "array",
            items: {
              type: "object",
              required: ["id", "signal_key", "label", "type", "role"],
              properties: {
                id: { type: "string", description: "unique within this chain, e.g. 'n1'" },
                signal_key: { type: "string" },
                label: { type: "string", description: "display name" },
                type: {
                  enum: [
                    "sleep",
                    "recovery",
                    "nutrition",
                    "biomarker",
                    "activity",
                    "intervention",
                    "cycle",
                    "symptom",
                    "physiology",
                  ],
                },
                role: {
                  enum: ["root_driver", "mediator", "outcome", "modifier"],
                },
                value: { type: ["string", "number", "null"] },
                trend: { enum: ["up", "down", "flat", null] },
                status: {
                  enum: [
                    "in_range",
                    "low",
                    "high",
                    "trending_up",
                    "trending_down",
                    "flat",
                    null,
                  ],
                },
              },
            },
          },
          edges: {
            type: "array",
            items: {
              type: "object",
              required: ["from", "to", "type", "confidence", "evidence", "prior_id"],
              properties: {
                from: { type: "string", description: "node id" },
                to: { type: "string", description: "node id" },
                type: { enum: ["drives", "reduces", "increases", "modulates"] },
                confidence: { type: "number", minimum: 0, maximum: 1 },
                evidence: {
                  type: "string",
                  description: "the user's SPECIFIC data supporting this link",
                },
                mechanism: {
                  type: "string",
                  description: "plain-language mechanism (from the prior)",
                },
                prior_id: {
                  type: ["string", "null"],
                  description: "id of the prior backing this edge, or null if inferred",
                },
              },
            },
          },
        },
      },
    },
  } as unknown as Anthropic.Messages.Tool.InputSchema,
};
