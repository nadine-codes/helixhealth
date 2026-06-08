import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/lib/dashboard";
import { AppHeader } from "@/components/AppHeader";
import { DataClient } from "@/components/DataClient";

export const dynamic = "force-dynamic";

export default async function DataPage() {
  const sb = await createClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const data = await getDashboardData(sb, user.id);

  return (
    <>
      <AppHeader active="data" />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">Your data</h1>
            <p className="text-sm text-[var(--color-muted)]">
              Add evidence and watch Helix re-reason.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="shrink-0 self-end rounded-xl border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-medium hover:border-[var(--color-accent)]"
          >
            ← Back to dashboard
          </Link>
        </div>

        <div className="mt-6">
          <DataClient hasBloodwork={data.hasBloodwork} hasGlp1={data.hasGlp1} />
        </div>
      </main>

      <footer className="border-t border-[var(--color-line)] bg-white/70 py-3 text-center text-xs text-[var(--color-muted)]">
        Helix provides health understanding, not medical advice.
      </footer>
    </>
  );
}
