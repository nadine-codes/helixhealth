import Link from "next/link";
import { enterDemo, sendMagicLink } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const sp = await searchParams;

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 text-[var(--color-accent)] font-semibold tracking-tight">
            <HelixMark />
            <span className="text-xl">Helix Health</span>
          </div>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight">
            Every app shows you <em className="not-italic text-[var(--color-muted)]">what</em>.
          </h1>
          <p className="text-2xl font-semibold tracking-tight">
            Helix shows you <span className="text-[var(--color-accent)]">why</span>.
          </p>
        </div>

        <div className="card p-6">
          <form action={enterDemo}>
            <button
              type="submit"
              className="w-full rounded-xl bg-[var(--color-accent)] px-4 py-3 text-white font-medium shadow-sm transition hover:brightness-105 active:scale-[0.99]"
            >
              Enter Demo →
            </button>
          </form>
          <p className="mt-2 text-center text-xs text-[var(--color-muted)]">
            One click into Jane Doe&rsquo;s populated account.
          </p>

          <div className="my-5 flex items-center gap-3 text-xs text-[var(--color-muted)]">
            <div className="h-px flex-1 bg-[var(--color-line)]" />
            or use a magic link
            <div className="h-px flex-1 bg-[var(--color-line)]" />
          </div>

          <form action={sendMagicLink} className="flex gap-2">
            <input
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="flex-1 rounded-xl border border-[var(--color-line)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--color-accent)]"
            />
            <button
              type="submit"
              className="rounded-xl border border-[var(--color-line)] px-4 py-2.5 text-sm font-medium hover:bg-slate-50"
            >
              Send
            </button>
          </form>

          {sp.sent && (
            <p className="mt-3 text-center text-sm text-[var(--color-accent)]">
              Check your inbox for a sign-in link.
            </p>
          )}
          {sp.error && (
            <p className="mt-3 text-center text-sm text-rose-600">{sp.error}</p>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-[var(--color-muted)]">
          Helix provides health understanding, not medical advice.
        </p>
        <p className="mt-2 text-center text-xs text-[var(--color-muted)]">
          <Link href="/" className="underline">
            Back home
          </Link>
        </p>
      </div>
    </main>
  );
}

function HelixMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 3c0 4 10 5 10 9s-10 5-10 9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M17 3c0 4-10 5-10 9s10 5 10 9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}
