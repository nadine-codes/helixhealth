"use client";

import { useEffect, useState } from "react";

// Lightweight "writes itself" reveal of the narrative prose.
export function Narrative({ text }: { text: string }) {
  const words = text.split(/(\s+)/);
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(0);
    const id = setInterval(() => {
      setCount((c) => {
        if (c >= words.length) {
          clearInterval(id);
          return c;
        }
        return c + 1;
      });
    }, 28);
    return () => clearInterval(id);
  }, [text, words.length]);

  return (
    <p className="text-[15px] leading-relaxed text-[var(--color-ink)]/90">
      {words.slice(0, count).join("")}
      {count < words.length && (
        <span className="ml-0.5 inline-block h-4 w-[2px] -mb-0.5 animate-pulse bg-[var(--color-accent)]" />
      )}
    </p>
  );
}
