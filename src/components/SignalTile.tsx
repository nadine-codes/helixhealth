import type { EvidenceSignal } from "@/lib/types";

function fmt(v: number | string | null, unit: string | null) {
  if (v == null) return "—";
  if (unit === "steps" && typeof v === "number") return v.toLocaleString();
  return String(v);
}

export function SignalTile({ signal }: { signal: EvidenceSignal }) {
  const isBad =
    signal.status === "low" ||
    signal.status === "high" ||
    (signal.status === "trending_down" && higherBetter(signal)) ||
    (signal.status === "trending_up" && !higherBetter(signal));

  const arrow =
    signal.trend === "up" ? "↑" : signal.trend === "down" ? "↓" : "→";

  return (
    <div className={`t-${signal.type} card card-hover tile-accent p-4`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--color-muted)]">
          {signal.name}
        </span>
        <span
          className="h-2 w-2 rounded-full"
          style={{ background: "var(--type)", boxShadow: "0 0 0 3px color-mix(in srgb, var(--type) 18%, transparent)" }}
        />
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tabular-nums tracking-tight">
          {fmt(signal.recent_value, signal.unit)}
        </span>
        <span className="text-xs text-[var(--color-muted)]">{signal.unit}</span>
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-xs">
        <span className={isBad ? "text-rose-600" : "text-emerald-600"}>
          {arrow} {signal.pct_change != null ? `${Math.abs(signal.pct_change)}%` : ""}
        </span>
        {signal.status === "low" && (
          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
            LOW
          </span>
        )}
        {signal.status === "high" && (
          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
            HIGH
          </span>
        )}
        <span className="text-[var(--color-muted)]">vs {fmt(signal.baseline, signal.unit)} baseline</span>
      </div>
    </div>
  );
}

function higherBetter(s: EvidenceSignal): boolean {
  // symptom + resting hr + weight: lower is better; others higher is better
  const lowerBetter = ["afternoon_fatigue", "brain_fog", "cravings", "resting_hr", "weight_trend"];
  return !lowerBetter.includes(s.key);
}
