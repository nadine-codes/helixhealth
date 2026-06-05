"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { InsightChain, InsightEdge, InsightNode } from "@/lib/types";
import { NodeCard } from "./NodeCard";

// Layout the chain as a vertical layered DAG: row = longest-path depth from root.
function layoutRows(chain: InsightChain): InsightNode[][] {
  const nodes = chain.nodes;
  const idIndex = new Map(nodes.map((n, i) => [n.id, i]));
  const incoming = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const n of nodes) {
    incoming.set(n.id, 0);
    adj.set(n.id, []);
  }
  for (const e of chain.edges) {
    if (!idIndex.has(e.from) || !idIndex.has(e.to)) continue;
    adj.get(e.from)!.push(e.to);
    incoming.set(e.to, (incoming.get(e.to) ?? 0) + 1);
  }

  const root =
    nodes.find((n) => n.role === "root_driver")?.id ??
    nodes.find((n) => (incoming.get(n.id) ?? 0) === 0)?.id ??
    nodes[0]?.id;

  // longest-path distance from the root via BFS (chains are small DAGs)
  const fromRoot = new Map<string, number>();
  if (root) {
    const queue: [string, number][] = [[root, 0]];
    fromRoot.set(root, 0);
    while (queue.length) {
      const [id, d] = queue.shift()!;
      for (const next of adj.get(id) ?? []) {
        const nd = d + 1;
        if (nd > (fromRoot.get(next) ?? -1)) {
          fromRoot.set(next, nd);
          queue.push([next, nd]);
        }
      }
    }
  }

  const maxRow = Math.max(0, ...nodes.map((n) => fromRoot.get(n.id) ?? 0));
  const rowOf = (n: InsightNode) => {
    if (n.role === "outcome") return maxRow + 1;
    if (n.role === "root_driver") return 0;
    return fromRoot.get(n.id) ?? 1;
  };

  const rowsMap = new Map<number, InsightNode[]>();
  for (const n of nodes) {
    const r = rowOf(n);
    if (!rowsMap.has(r)) rowsMap.set(r, []);
    rowsMap.get(r)!.push(n);
  }
  return [...rowsMap.keys()]
    .sort((a, b) => a - b)
    .map((k) => rowsMap.get(k)!);
}

interface Conn {
  edge: InsightEdge;
  d: string;
  dash: string | undefined;
  color: string;
  delay: number;
}

const TYPE_STYLE: Record<string, { color: string; dash?: string }> = {
  drives: { color: "var(--color-accent)" },
  increases: { color: "#10b981" },
  reduces: { color: "#f43f5e", dash: "6 6" },
  modulates: { color: "#94a3b8", dash: "2 6" },
};

export function CausalCascade({ chain }: { chain: InsightChain }) {
  const rows = useMemo(() => layoutRows(chain), [chain]);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [conns, setConns] = useState<Conn[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    function measure() {
      const container = containerRef.current;
      if (!container) return;
      const crect = container.getBoundingClientRect();
      setSize({ w: crect.width, h: crect.height });
      const next: Conn[] = [];
      chain.edges.forEach((edge, i) => {
        const fromEl = nodeRefs.current.get(edge.from);
        const toEl = nodeRefs.current.get(edge.to);
        if (!fromEl || !toEl) return;
        const f = fromEl.getBoundingClientRect();
        const t = toEl.getBoundingClientRect();
        const x1 = f.left + f.width / 2 - crect.left;
        const y1 = f.bottom - crect.top;
        const x2 = t.left + t.width / 2 - crect.left;
        const y2 = t.top - crect.top;
        const my = (y1 + y2) / 2;
        const d = `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
        const style = TYPE_STYLE[edge.type] ?? TYPE_STYLE.drives;
        next.push({
          edge,
          d,
          dash: style.dash,
          color: style.color,
          delay: i * 0.55 + 0.35,
        });
      });
      setConns(next);
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [chain, rows]);

  let flatIndex = 0;

  return (
    <div ref={containerRef} className="relative flex flex-col items-center gap-12 py-2">
      <svg
        className="pointer-events-none absolute inset-0"
        width={size.w}
        height={size.h}
        style={{ zIndex: 0 }}
      >
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-accent)" />
          </marker>
        </defs>
        {conns.map((c, i) => (
          <motion.path
            key={i}
            d={c.d}
            fill="none"
            stroke={c.color}
            strokeWidth={2}
            strokeDasharray={c.dash}
            markerEnd="url(#arrow)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.85 }}
            transition={{ delay: c.delay, duration: 0.5, ease: "easeInOut" }}
          />
        ))}
      </svg>

      {rows.map((row, ri) => (
        <div
          key={ri}
          className="relative z-10 flex flex-wrap items-stretch justify-center gap-6"
        >
          {row.map((node) => {
            const idx = flatIndex++;
            return (
              <div
                key={node.id}
                ref={(el) => {
                  if (el) nodeRefs.current.set(node.id, el);
                }}
              >
                <NodeCard
                  node={node}
                  index={idx}
                  isRoot={node.role === "root_driver"}
                  isOutcome={node.role === "outcome"}
                />
              </div>
            );
          })}
        </div>
      ))}

      {/* evidence under each link */}
      <div className="z-10 mt-2 w-full max-w-2xl space-y-2">
        {chain.edges.map((e, i) => {
          const from = chain.nodes.find((n) => n.id === e.from);
          const to = chain.nodes.find((n) => n.id === e.to);
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.55 + 0.7, duration: 0.4 }}
              className="rounded-lg border border-[var(--color-line)] bg-white/70 px-3 py-2 text-sm"
            >
              <span className="font-medium">
                {from?.label} <span className="text-[var(--color-muted)]">{e.type}</span>{" "}
                {to?.label}
              </span>
              {e.prior_id && (
                <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                  {e.prior_id}
                </span>
              )}
              <p className="mt-0.5 text-[var(--color-muted)]">{e.evidence}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
