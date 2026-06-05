import { z } from "zod";

const nodeSchema = z.object({
  id: z.string(),
  signal_key: z.string(),
  label: z.string(),
  type: z.enum([
    "sleep",
    "recovery",
    "nutrition",
    "biomarker",
    "activity",
    "intervention",
    "cycle",
    "symptom",
    "physiology",
  ]),
  role: z.enum(["root_driver", "mediator", "outcome", "modifier"]),
  value: z.union([z.string(), z.number(), z.null()]).optional(),
  trend: z.enum(["up", "down", "flat"]).nullable().optional(),
  status: z
    .enum([
      "in_range",
      "low",
      "high",
      "trending_up",
      "trending_down",
      "flat",
    ])
    .nullable()
    .optional(),
});

const edgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  type: z.enum(["drives", "reduces", "increases", "modulates"]),
  confidence: z.number().min(0).max(1),
  evidence: z.string(),
  mechanism: z.string().optional(),
  prior_id: z.string().nullable(),
});

const chainSchema = z.object({
  summary: z.string(),
  confidence: z.number().min(0).max(1),
  nodes: z.array(nodeSchema).min(2),
  edges: z.array(edgeSchema).min(1),
});

export const insightSchema = z.object({
  question: z.string(),
  primary_chain: chainSchema,
  secondary_chains: z.array(chainSchema).max(2).optional().default([]),
  highest_impact_action: z.object({
    title: z.string(),
    rationale: z.string(),
    target_signal: z.string(),
    leverage: z.number().min(0).max(1),
    confidence: z.number().min(0).max(1),
    feasibility: z.number().min(0).max(1),
    requires_clinician: z.boolean(),
  }),
  narrative: z.string(),
  confidence_overall: z.number().min(0).max(1).optional(),
  disclaimer: z.string(),
});

export type ValidatedInsight = z.infer<typeof insightSchema>;
