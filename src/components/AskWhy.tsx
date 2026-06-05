"use client";

import { useState } from "react";

export const SUGGESTED_QUESTIONS = [
  "Why am I exhausted every afternoon?",
  "Why is my recovery declining?",
  "Why is my recovery worse this month?",
  "Why do I feel worse in the late luteal phase?",
];

export function AskWhy({
  onAsk,
  loading,
}: {
  onAsk: (q: string) => void;
  loading: boolean;
}) {
  const [value, setValue] = useState("");

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) onAsk(value.trim());
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-accent)]">
            ✦
          </span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Ask why… e.g. Why am I exhausted every afternoon?"
            className="w-full rounded-2xl border border-[var(--color-line)] bg-white py-3.5 pl-10 pr-4 text-[15px] shadow-sm outline-none focus:border-[var(--color-accent)]"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !value.trim()}
          className="rounded-2xl bg-[var(--color-accent)] px-6 py-3.5 font-medium text-white shadow-sm transition hover:brightness-105 disabled:opacity-50"
        >
          {loading ? "Reasoning…" : "Ask Why"}
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => onAsk(q)}
            disabled={loading}
            className="rounded-full border border-[var(--color-line)] bg-white px-3.5 py-1.5 text-sm text-[var(--color-ink)]/80 transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
