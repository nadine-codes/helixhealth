"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Insight } from "@/lib/types";
import { fetchJson, errorMessage } from "@/lib/http";
import { AskWhy } from "./AskWhy";
import { InsightView } from "./InsightView";

type State =
  | { kind: "idle" }
  | { kind: "loading"; question: string }
  | { kind: "error"; message: string }
  | { kind: "result"; insight: Insight; cached: boolean };

export function DashboardClient() {
  const [state, setState] = useState<State>({ kind: "idle" });
  const resultRef = useRef<HTMLDivElement>(null);

  async function ask(question: string) {
    setState({ kind: "loading", question });
    try {
      const result = await fetchJson<{
        insight: Insight;
        cached: boolean;
        error?: string;
      }>("/api/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const { res, data } = result;
      if (!res.ok || !data?.insight) {
        throw new Error(errorMessage(result, "Request failed"));
      }
      setState({ kind: "result", insight: data.insight, cached: data.cached });
      setTimeout(
        () => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        80
      );
    } catch (e) {
      setState({
        kind: "error",
        message: e instanceof Error ? e.message : "Something went wrong",
      });
    }
  }

  return (
    <div>
      <AskWhy onAsk={ask} loading={state.kind === "loading"} />

      <div ref={resultRef} className="mt-8 scroll-mt-6">
        <AnimatePresence mode="wait">
          {state.kind === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="card p-8"
            >
              <div className="flex items-center gap-3 text-[var(--color-muted)]">
                <span className="h-2 w-2 animate-ping rounded-full bg-[var(--color-accent)]" />
                Tracing the causal chain behind &ldquo;{state.question}&rdquo;…
              </div>
              <div className="mt-6 space-y-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-16 animate-pulse rounded-xl bg-slate-100"
                    style={{ width: `${90 - i * 12}%` }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {state.kind === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card border-rose-200 bg-rose-50 p-6 text-sm text-rose-700"
            >
              {state.message}
            </motion.div>
          )}

          {state.kind === "result" && (
            <motion.div
              key={state.insight.question}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <InsightView insight={state.insight} cached={state.cached} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
