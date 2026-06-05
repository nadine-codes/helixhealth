// Core shared types for Helix Health.

export type SignalType =
  | "sleep"
  | "recovery"
  | "nutrition"
  | "biomarker"
  | "activity"
  | "intervention"
  | "cycle"
  | "symptom"
  | "physiology";

export type SignalStatus =
  | "in_range"
  | "low"
  | "high"
  | "trending_up"
  | "trending_down"
  | "flat";

export type Trend = "up" | "down" | "flat";

export type EdgeType = "drives" | "reduces" | "increases" | "modulates";

export type NodeRole = "root_driver" | "mediator" | "outcome" | "modifier";

// A normalized health datapoint (row in `signals`).
export interface SignalRow {
  id?: string;
  user_id: string;
  key: string;
  name: string;
  type: SignalType;
  value: number | null;
  text_value?: string | null;
  unit: string | null;
  window_date: string; // ISO date (point in time / day)
  status: SignalStatus | null;
  direction: Trend | null;
  source: "seeded" | "bloodwork_pdf" | "manual_log";
  reference_low?: number | null;
  reference_high?: number | null;
}

// Curated physiological relationship (row in `priors`).
export interface Prior {
  id: string;
  cause: string;
  effect: string;
  type: EdgeType;
  mechanism: string;
  evidence_signals: string[];
  confidence: number;
  domain:
    | "sleep"
    | "recovery"
    | "nutrition"
    | "biomarker"
    | "intervention"
    | "cycle"
    | "activity"
    | "symptom";
  requires_clinician: boolean;
}

// Intervention logged by the user (row in `interventions`).
export interface InterventionRow {
  id?: string;
  user_id: string;
  key: string;
  name: string;
  started: string; // ISO date
  notes?: string | null;
}

// ---- Insight engine I/O (the emit_insight contract) ----

export interface EvidenceSignal {
  key: string;
  name: string;
  type: SignalType;
  unit: string | null;
  recent_value: number | string | null;
  baseline: number | string | null;
  trend: Trend | null;
  change_started?: string | null;
  status: SignalStatus | null;
  pct_change?: number | null;
}

export interface EvidencePacket {
  question: string;
  as_of_date: string;
  user_context: {
    menstruates: boolean;
    current_cycle_phase: string | null;
  };
  active_interventions: {
    key: string;
    name: string;
    started: string;
    weeks_active: number;
  }[];
  signals: EvidenceSignal[];
}

export interface InsightNode {
  id: string;
  signal_key: string;
  label: string;
  type: SignalType;
  role: NodeRole;
  value?: number | string | null;
  trend?: Trend | null;
  status?: SignalStatus | null;
}

export interface InsightEdge {
  from: string;
  to: string;
  type: EdgeType;
  confidence: number;
  evidence: string;
  mechanism?: string;
  prior_id: string | null;
}

export interface InsightChain {
  summary: string;
  confidence: number;
  nodes: InsightNode[];
  edges: InsightEdge[];
}

export interface HighestImpactAction {
  title: string;
  rationale: string;
  target_signal: string;
  leverage: number;
  confidence: number;
  feasibility: number;
  requires_clinician: boolean;
}

export interface Insight {
  question: string;
  primary_chain: InsightChain;
  secondary_chains?: InsightChain[];
  highest_impact_action: HighestImpactAction;
  narrative: string;
  confidence_overall?: number;
  disclaimer: string;
}

export const DISCLAIMER =
  "Helix provides health understanding, not medical advice.";
