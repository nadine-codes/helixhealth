"use client";

import { motion } from "framer-motion";
import type { InsightNode } from "@/lib/types";

const TYPE_LABEL: Record<string, string> = {
  sleep: "Sleep",
  recovery: "Recovery",
  physiology: "Physiology",
  nutrition: "Nutrition",
  biomarker: "Biomarker",
  activity: "Activity",
  intervention: "Intervention",
  cycle: "Cycle",
  symptom: "Symptom",
};

function TrendArrow({ trend }: { trend?: InsightNode["trend"] }) {
  if (!trend || trend === "flat") return <span className="text-[var(--color-muted)]">→</span>;
  return trend === "up" ? (
    <span className="text-rose-500">↑</span>
  ) : (
    <span className="text-emerald-600">↓</span>
  );
}

export function NodeCard({
  node,
  index,
  isRoot,
  isOutcome,
}: {
  node: InsightNode;
  index: number;
  isRoot: boolean;
  isOutcome: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.55 + 0.1, duration: 0.45, ease: "easeOut" }}
      className={`t-${node.type} relative w-[clamp(220px,72vw,320px)]`}
    >
      <div
        className={`card px-4 py-3 ${isRoot ? "animate-glow" : ""}`}
        style={{ borderColor: "var(--type)" }}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide"
            style={{ color: "var(--type)" }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: "var(--type)" }}
            />
            {TYPE_LABEL[node.type] ?? node.type}
          </span>
          {isRoot && (
            <span className="rounded-full bg-[var(--color-accent-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-accent)]">
              ROOT DRIVER
            </span>
          )}
          {isOutcome && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
              OUTCOME
            </span>
          )}
        </div>
        <div className="mt-1.5 flex items-baseline justify-between gap-3">
          <span className="font-semibold tracking-tight">{node.label}</span>
          {node.value != null && node.value !== "" && (
            <span className="flex items-baseline gap-1 text-sm tabular-nums text-[var(--color-ink)]">
              <TrendArrow trend={node.trend} />
              {String(node.value)}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
