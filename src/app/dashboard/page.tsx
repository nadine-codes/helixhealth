import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/lib/dashboard";
import { AppHeader } from "@/components/AppHeader";
import { SignalTile } from "@/components/SignalTile";
import { DashboardClient } from "@/components/DashboardClient";

export const dynamic = "force-dynamic";

const phaseLabel: Record<string, string> = {
  menstrual: "Menstrual",
  follicular: "Follicular",
  ovulation: "Ovulation",
  luteal: "Luteal",
  late_luteal: "Late luteal",
};

export default async function DashboardPage() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const data = await getDashboardData(sb, user.id);
  const allTiles = [...data.tiles, ...data.biomarkers];

  return (
    <>
      <AppHeader active="dashboard" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight">
              Good afternoon, <span className="gradient-text">Jane</span>
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[var(--color-muted)]">
              <span>As of June 4, 2026</span>
              {data.cyclePhase && (
                <span className="rounded-full bg-pink-50 px-2 py-0.5 text-xs font-medium text-pink-600">
                  {phaseLabel[data.cyclePhase] ?? data.cyclePhase} phase
                </span>
              )}
              {data.hasGlp1 && (
                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-600">
                  GLP-1 active
                </span>
              )}
              {data.hasBloodwork && (
                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-600">
                  Labs on file
                </span>
              )}
            </p>
          </div>
          <Link
            href="/data"
            className="shrink-0 self-end rounded-xl border border-[var(--color-line)] bg-white/80 px-4 py-2 text-sm font-medium shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            + Add data
          </Link>
        </div>

        {/* Daily briefing */}
        {data.briefing && (
          <section className="mt-6 card overflow-hidden">
            <div className="relative p-5 pl-6">
              <span className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-[var(--color-accent)] to-indigo-400" />
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-accent)]">
                <span aria-hidden>✦</span>
                Daily briefing: what&rsquo;s driving you this week
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-ink)]/90">
                {data.briefing.text}
              </p>
              {data.briefing.top_action && (
                <div className="mt-4 flex items-start justify-between gap-6 rounded-xl border border-[var(--color-line)] bg-slate-50/60 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-accent)]">
                      Top action
                    </p>
                    <p className="mt-1 text-sm font-medium text-[var(--color-ink)]">
                      {data.briefing.top_action}
                    </p>
                  </div>
                  {data.briefing.root_driver && (
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
                        Root driver
                      </p>
                      <p className="mt-1 text-sm font-medium text-[var(--color-ink)]">
                        {data.briefing.root_driver}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Signal tiles */}
        <section className="mt-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {allTiles.map((s) => (
              <SignalTile key={s.key} signal={s} />
            ))}
          </div>
        </section>

        {/* Ask Why */}
        <section className="mt-10">
          <h2 className="mb-1 text-2xl font-semibold tracking-tight">
            Ask Helix <span className="gradient-text">why</span>
          </h2>
          <p className="mb-4 text-sm text-[var(--color-muted)]">
            Trace the causal chain behind what you feel, and the one thing to do about it.
          </p>
          <DashboardClient />
        </section>
      </main>

      <footer className="border-t border-[var(--color-line)] bg-white/70 py-3 text-center text-xs text-[var(--color-muted)]">
        Helix provides health understanding, not medical advice.
      </footer>
    </>
  );
}
