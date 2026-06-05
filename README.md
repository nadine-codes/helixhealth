# Helix Health

**Every app shows you _what_. Helix shows you _why_.**

An AI health-intelligence layer that connects fragmented health signals (wearables,
labs, symptoms, interventions) into a single causal model and answers the question
dashboards ignore: **why?** It traces the most plausible causal chain behind a
question, cites the user's own data for every link, and surfaces the single
highest-impact action — grounded in a curated knowledge base of physiological
relationships so the reasoning stays defensible.

> Helix provides health understanding, not medical advice.

## Stack

- **Next.js 15** (App Router) · TypeScript · Tailwind CSS
- **Supabase** — Postgres, Auth (magic link + one-click demo), Storage, RLS
- **Anthropic SDK** (server-side) — `claude-opus-4-8` for reasoning, `claude-haiku-4-5` for bloodwork extraction
- **Framer Motion** — the self-drawing causal cascade visualization
- Deployed on **Vercel**

## Architecture

```
seed/upload → signals (normalized) → [question]
   → assemble evidence packet + curated priors
   → Claude (forced emit_insight tool call, schema-validated)
   → insight (causal chain JSON) → persist + render animated map
```

- `src/lib/priors.ts` — 45 curated physiological priors (P01–P45), the grounding moat.
- `src/lib/seed-timeline.ts` — deterministic Jane Doe dataset encoding three story arcs.
- `src/lib/engine/` — evidence assembly, cached system prompt, forced tool call, zod validation.
- `src/components/CausalCascade.tsx` — the animated causal-chain visualization.
- `scripts/harness.ts` — fires the three demo questions and checks them against the sanity table.

## Setup

1. Copy env vars into `.env.local`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ANTHROPIC_API_KEY=...
   DEMO_EMAIL=jane@helix.demo
   DEMO_PASSWORD=...
   DATABASE_URL=postgresql://...        # Supabase Postgres connection string (for schema apply)
   ```

2. Apply the database schema, seed the demo data, and generate the sample lab PDF:

   ```bash
   npm run db:apply        # creates tables, RLS, storage bucket
   npm run seed            # priors + Jane Doe's 90-day timeline + daily briefing
   npm run bloodwork:pdf   # writes public/jane-doe-labs.pdf
   ```

3. Verify the reasoning against the sanity table, then pre-cache the demo answers:

   ```bash
   npm run harness         # Act 1 sleep · Act 2 ferritin · Act 3 GLP-1 protein
   npm run precache        # stores the three demo answers as a safety net
   ```

4. Run it:

   ```bash
   npm run dev
   ```

## Demo (three acts)

1. **Ask why** — "Why am I exhausted every afternoon?" → root driver **sleep consistency**.
2. **It reads your labs** — upload bloodwork → "Why is my recovery declining?" → root driver **ferritin**.
3. **It reasons about change** — log GLP-1 → "Why is my recovery worse this month?" → **GLP-1 → low protein**.

Same symptoms, three distinct causal explanations depending on the question and the
evidence present.
