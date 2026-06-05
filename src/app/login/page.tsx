import Link from "next/link";
import { enterDemo } from "./actions";

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
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)] shadow-sm">
              <HelixMark />
            </span>
            <span className="text-xl">Helix Health</span>
          </div>
          <h1 className="mt-7 text-3xl font-semibold leading-tight tracking-tight">
            Every app shows you{" "}
            <em className="not-italic text-[var(--color-muted)]">what</em>.
            <br />
            Helix shows you <span className="gradient-text">why</span>.
          </h1>
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            An AI health intelligence layer that connects your signals, uncovers
            what&rsquo;s driving your health, and suggests the next best step.
          </p>
        </div>

        <div className="card p-6">
          <form action={enterDemo}>
            <button
              type="submit"
              className="cta-attn cta-shine relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-[var(--color-accent)] to-indigo-500 px-4 py-3.5 text-[15px] font-semibold text-white transition hover:brightness-110 active:scale-[0.99]"
            >
              Enter Demo →
            </button>
          </form>
          <p className="mt-2 text-center text-xs text-[var(--color-muted)]">
            One click into Jane Doe&rsquo;s populated account.
          </p>

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
