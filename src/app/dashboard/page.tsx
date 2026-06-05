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
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Good afternoon, Jane
            </h1>
            <p className="text-sm text-[var(--color-muted)]">
              As of June 4, 2026
              {data.cyclePhase && ` · ${phaseLabel[data.cyclePhase] ?? data.cyclePhase} phase`}
              {data.hasGlp1 && " · GLP-1 active"}
            </p>
          </div>
          <Link
            href="/data"
            className="rounded-xl border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-medium hover:border-[var(--color-accent)]"
          >
            + Add data
          </Link>
        </div>

        {/* Daily briefing */}
        {data.briefing && (
          <section className="mt-6 card overflow-hidden">
            <div className="border-l-4 border-[var(--color-accent)] p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-accent)]">
                Daily briefing — what&rsquo;s driving you this week
              </h2>
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-ink)]/90">
                {data.briefing.text}
              </p>
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
          <h2 className="mb-3 text-lg font-semibold tracking-tight">
            Ask Helix <span className="text-[var(--color-accent)]">why</span>
          </h2>
          <DashboardClient />
        </section>
      </main>

      <footer className="border-t border-[var(--color-line)] bg-white/70 py-3 text-center text-xs text-[var(--color-muted)]">
        Helix provides health understanding, not medical advice.
      </footer>
    </>
  );
}
