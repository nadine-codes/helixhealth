"use client";

import { motion } from "framer-motion";
import type { HighestImpactAction } from "@/lib/types";

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1">
      <div className="flex items-center justify-between text-[11px] text-[var(--color-muted)]">
        <span>{label}</span>
        <span className="tabular-nums">{Math.round(value * 100)}%</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-slate-100">
        <motion.div
          className="h-full rounded-full bg-[var(--color-accent)]"
          initial={{ width: 0 }}
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export function ActionCard({ action }: { action: HighestImpactAction }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className="card overflow-hidden"
    >
      <div className="bg-[var(--color-accent)] px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-white">
        Your highest-impact action right now
      </div>
      <div className="p-5">
        <h3 className="text-lg font-semibold tracking-tight">{action.title}</h3>
        <p className="mt-2 text-sm text-[var(--color-ink)]/80">{action.rationale}</p>

        {action.requires_clinician && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <span aria-hidden>⚕️</span>
            <span>
              This involves clinical territory, so discuss with your physician before
              acting. Helix explains; it does not diagnose or prescribe.
            </span>
          </div>
        )}

        <div className="mt-4 flex gap-4">
          <Meter label="Leverage" value={action.leverage} />
          <Meter label="Confidence" value={action.confidence} />
          <Meter label="Feasibility" value={action.feasibility} />
        </div>
      </div>
    </motion.div>
  );
}
