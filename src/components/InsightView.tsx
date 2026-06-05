"use client";

import { motion } from "framer-motion";
import type { Insight } from "@/lib/types";
import { CausalCascade } from "./CausalCascade";
import { ActionCard } from "./ActionCard";
import { Narrative } from "./Narrative";

export function InsightView({
  insight,
  cached,
}: {
  insight: Insight;
  cached?: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
          <span className="rounded-full bg-[var(--color-accent-soft)] px-2 py-0.5 font-medium text-[var(--color-accent)]">
            Causal insight
          </span>
          {typeof insight.confidence_overall === "number" && (
            <span>
              Overall confidence {Math.round(insight.confidence_overall * 100)}%
            </span>
          )}
          {cached && <span className="text-slate-400">· cached</span>}
        </div>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">
          {insight.question}
        </h2>
        <div className="mt-3 max-w-2xl rounded-xl border border-[var(--color-line)] bg-white/60 p-4">
          <Narrative text={insight.narrative} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="card p-5">
          <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
            {insight.primary_chain.summary}
          </h3>
          <CausalCascade chain={insight.primary_chain} />
        </div>

        <div className="space-y-6">
          <ActionCard action={insight.highest_impact_action} />

          {insight.secondary_chains && insight.secondary_chains.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="card p-5"
            >
              <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                Other possible contributors
              </h3>
              <ul className="mt-3 space-y-3">
                {insight.secondary_chains.map((c, i) => (
                  <li key={i} className="text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                      <span className="font-medium">{c.summary}</span>
                    </div>
                    <span className="ml-3.5 text-[var(--color-muted)]">
                      {Math.round(c.confidence * 100)}% confidence
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </div>
      </div>

      <p className="text-xs text-[var(--color-muted)]">{insight.disclaimer}</p>
    </div>
  );
}
