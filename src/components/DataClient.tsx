"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { fetchJson, errorMessage } from "@/lib/http";

interface Extracted {
  name: string;
  key: string | null;
  value: number;
  unit: string;
  reference_low: number | null;
  reference_high: number | null;
  flag: "low" | "high" | "in_range";
}

type ConnectStatus = "idle" | "connecting" | "connected";

const CONNECT_SOURCES = [
  {
    id: "oura",
    name: "Oura",
    logo: "/brands/ouralogo.jpeg",
    tagline: "Sleep, HRV, and recovery from your ring",
    detail:
      "Nightly sleep stages, readiness, and resting heart rate, synced into your signal graph.",
    accent: "#002340",
  },
  {
    id: "whoop",
    name: "WHOOP",
    logo: "/brands/whooplogo.jpeg",
    tagline: "Strain, recovery, and cardiovascular load",
    detail:
      "Daily strain, recovery score, and HRV trends folded into causal reasoning.",
    accent: "#111111",
  },
  {
    id: "apple_health",
    name: "Apple Health",
    logo: "/brands/apple-health.png",
    tagline: "Activity, sleep, and vitals from iPhone and Watch",
    detail:
      "Steps, workouts, sleep, and heart metrics from your Apple ecosystem in one fabric.",
    accent: "#ff2d55",
  },
  {
    id: "lab_providers",
    name: "Lab providers",
    logo: "/brands/lab-providers.svg",
    tagline: "Quest, Labcorp, and other portals",
    detail:
      "Continuous biomarker sync from your lab portal instead of one-off PDF uploads.",
    accent: "#006747",
  },
] as const;

function statusLabel(status: ConnectStatus): string {
  if (status === "connecting") return "Authorizing and syncing signals…";
  if (status === "connected") return "Connected · syncing continuously";
  return "Tap Connect to link your account";
}

function ConnectSourceCard({
  source,
  status,
  onConnect,
}: {
  source: (typeof CONNECT_SOURCES)[number];
  status: ConnectStatus;
  onConnect: () => void;
}) {
  const { name, logo, tagline, detail } = source;

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold tracking-tight">{name}</h2>
      <p className="mt-1 text-sm text-[var(--color-muted)]">{tagline}</p>
      <p className="mt-3 text-sm text-[var(--color-ink)]/75">{detail}</p>
      <div className="mt-4 rounded-xl border border-[var(--color-line)] bg-[#f3faf8] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl shadow-sm">
              <img
                src={logo}
                alt=""
                width={44}
                height={44}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <p className="font-medium">{name}</p>
              <p
                className={`text-xs ${
                  status === "connecting"
                    ? "text-[var(--color-accent)]"
                    : "text-[var(--color-muted)]"
                }`}
              >
                {status === "connecting" && (
                  <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-accent)] align-middle" />
                )}
                {statusLabel(status)}
              </p>
            </div>
          </div>
          {status === "connected" ? (
            <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-sm font-medium text-[var(--color-accent)]">
              Connected ✓
            </span>
          ) : (
            <button
              type="button"
              onClick={onConnect}
              disabled={status === "connecting"}
              className="shrink-0 rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:brightness-105 disabled:opacity-60"
            >
              {status === "connecting" ? "Connecting…" : "Connect"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function DataClient({
  hasBloodwork,
  hasGlp1,
}: {
  hasBloodwork: boolean;
  hasGlp1: boolean;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [extracted, setExtracted] = useState<Extracted[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [glp1Logged, setGlp1Logged] = useState(hasGlp1);
  const [loggingGlp1, setLoggingGlp1] = useState(false);
  const [connectStatus, setConnectStatus] = useState<
    Record<string, ConnectStatus>
  >({});
  const inputRef = useRef<HTMLInputElement>(null);

  async function connectSource(id: string) {
    if ((connectStatus[id] ?? "idle") !== "idle") return;
    setConnectStatus((s) => ({ ...s, [id]: "connecting" }));
    await new Promise((r) => setTimeout(r, 2200));
    setConnectStatus((s) => ({ ...s, [id]: "connected" }));
  }

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const result = await fetchJson<{ extracted: Extracted[]; error?: string }>(
        "/api/bloodwork",
        { method: "POST", body: fd }
      );
      const { res, data } = result;
      if (!res.ok || !data?.extracted) {
        throw new Error(errorMessage(result, "Upload failed"));
      }
      setExtracted(data.extracted);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function logGlp1() {
    setLoggingGlp1(true);
    setError(null);
    try {
      const result = await fetchJson<{ error?: string }>("/api/intervention", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "glp1",
          name: "Semaglutide (GLP-1)",
          started: "2026-05-07",
          notes: "Started ~4 weeks ago to lose ~10 lbs.",
        }),
      });
      if (!result.res.ok) throw new Error(errorMessage(result, "Failed"));
      setGlp1Logged(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoggingGlp1(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Bloodwork upload */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold tracking-tight">Upload bloodwork</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Drag in a lab PDF. Helix reads it, flags out-of-range markers, and folds
          them into your causal model.
        </p>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) upload(f);
          }}
          onClick={() => inputRef.current?.click()}
          className={`mt-4 cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition ${
            dragOver
              ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]/40"
              : "border-[var(--color-line)] hover:border-[var(--color-accent)]"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
            }}
          />
          {uploading ? (
            <span className="text-[var(--color-accent)]">Reading your labs…</span>
          ) : (
            <span className="text-sm text-[var(--color-muted)]">
              Drop a PDF here or click to browse
            </span>
          )}
        </div>

        <a
          href="/jane-doe-labs.pdf"
          className="mt-3 inline-block text-xs text-[var(--color-accent)] underline"
        >
          Download Jane&rsquo;s sample lab PDF
        </a>

        {(hasBloodwork || extracted) && !uploading && (
          <p className="mt-2 text-xs text-emerald-600">Bloodwork on file ✓</p>
        )}

        {extracted && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 overflow-hidden rounded-xl border border-[var(--color-line)]"
          >
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-[var(--color-muted)]">
                <tr>
                  <th className="px-3 py-2">Marker</th>
                  <th className="px-3 py-2">Value</th>
                  <th className="px-3 py-2">Range</th>
                  <th className="px-3 py-2">Flag</th>
                </tr>
              </thead>
              <tbody>
                {extracted.map((m, i) => (
                  <tr key={i} className="border-t border-[var(--color-line)]">
                    <td className="px-3 py-2 font-medium">{m.name}</td>
                    <td className="px-3 py-2 tabular-nums">
                      {m.value} {m.unit}
                    </td>
                    <td className="px-3 py-2 text-[var(--color-muted)]">
                      {m.reference_low ?? "–"}–{m.reference_high ?? "–"}
                    </td>
                    <td className="px-3 py-2">
                      {m.flag === "in_range" ? (
                        <span className="text-emerald-600">in range</span>
                      ) : (
                        <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 uppercase">
                          {m.flag}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </div>

      {/* Log intervention */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold tracking-tight">Log an intervention</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Tell Helix about a medication or lifestyle change. It re-reasons over the
          downstream cascade.
        </p>

        <div className="mt-4 rounded-xl border border-[var(--color-line)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium">Semaglutide (GLP-1)</p>
              <p className="text-xs text-[var(--color-muted)]">Started 4 weeks ago (May 7, 2026)</p>
            </div>
            {glp1Logged ? (
              <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-[var(--color-accent-soft)] px-3 py-1 text-sm font-medium text-[var(--color-accent)]">
                Logged ✓
              </span>
            ) : (
              <button
                onClick={logGlp1}
                disabled={loggingGlp1}
                className="shrink-0 whitespace-nowrap rounded-xl bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {loggingGlp1 ? "Logging…" : "Log GLP-1"}
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <span aria-hidden>⚕️</span>
          <span>
            Helix never starts, stops, or doses medications. Anything clinical is
            framed as &ldquo;discuss with your physician.&rdquo;
          </span>
        </div>
      </div>

      {error && (
        <p className="lg:col-span-2 text-sm text-rose-600">{error}</p>
      )}

      <div className="lg:col-span-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-muted)]">
          Connect sources
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Wearables and lab portals for continuous signal ingestion into your
          causal model.
        </p>
      </div>

      {CONNECT_SOURCES.map((source) => (
        <ConnectSourceCard
          key={source.id}
          source={source}
          status={connectStatus[source.id] ?? "idle"}
          onConnect={() => connectSource(source.id)}
        />
      ))}
    </div>
  );
}
