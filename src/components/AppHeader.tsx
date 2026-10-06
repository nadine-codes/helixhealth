import Link from "next/link";
import { signOut } from "@/app/login/actions";

export function AppHeader({ active }: { active: "dashboard" | "data" }) {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/dashboard" className="flex items-center gap-2.5 font-semibold tracking-tight text-[var(--color-accent)]">
          {/* same mark as public/icon.svg (favicon), scaled for the nav */}
          <svg width="32" height="32" viewBox="0 0 512 512" fill="none" aria-hidden className="shrink-0">
            <rect width="512" height="512" rx="171" fill="var(--color-accent-soft)" />
            <g transform="translate(99.33 99.33) scale(13.056)" stroke="currentColor" strokeLinecap="round">
              <path d="M7 3c0 4 10 5 10 9s-10 5-10 9" strokeWidth="1.8" />
              <path d="M17 3c0 4-10 5-10 9s10 5 10 9" strokeWidth="1.8" opacity="0.5" />
            </g>
          </svg>
          Helix Health
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/dashboard"
            className={`rounded-lg px-3 py-1.5 ${active === "dashboard" ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]" : "text-[var(--color-muted)] hover:bg-slate-50"}`}
          >
            Dashboard
          </Link>
          <Link
            href="/data"
            className={`rounded-lg px-3 py-1.5 ${active === "data" ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]" : "text-[var(--color-muted)] hover:bg-slate-50"}`}
          >
            Data
          </Link>
          <form action={signOut}>
            <button className="ml-1 rounded-lg px-3 py-1.5 text-[var(--color-muted)] hover:bg-slate-50">
              Sign out
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
