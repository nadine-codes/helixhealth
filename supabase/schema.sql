-- Helix Health — Supabase schema
-- Tables: signals, priors, interventions, insights, documents
-- RLS: user_id = auth.uid(); priors are shared read-only.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- signals: the universal normalized health datapoints
-- ---------------------------------------------------------------------------
create table if not exists public.signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null,
  name text not null,
  type text not null,
  value numeric,
  text_value text,
  unit text,
  window_date date not null,
  status text,
  direction text,
  source text not null default 'seeded',
  reference_low numeric,
  reference_high numeric,
  created_at timestamptz not null default now()
);
create index if not exists signals_user_key_date_idx
  on public.signals (user_id, key, window_date);

-- ---------------------------------------------------------------------------
-- priors: curated physiological knowledge base (shared, read-only)
-- ---------------------------------------------------------------------------
create table if not exists public.priors (
  id text primary key,
  cause text not null,
  effect text not null,
  type text not null,
  mechanism text not null,
  evidence_signals jsonb not null default '[]'::jsonb,
  confidence numeric not null,
  domain text not null,
  requires_clinician boolean not null default false
);

-- ---------------------------------------------------------------------------
-- interventions: user-logged changes (supplements, meds, lifestyle)
-- ---------------------------------------------------------------------------
create table if not exists public.interventions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null,
  name text not null,
  started date not null,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- insights: persisted Claude outputs (history + caching + demo safety net)
-- ---------------------------------------------------------------------------
create table if not exists public.insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'insight', -- 'insight' | 'briefing'
  question text,
  cache_key text,
  payload jsonb,
  narrative text,
  confidence numeric,
  created_at timestamptz not null default now()
);
create index if not exists insights_user_kind_idx
  on public.insights (user_id, kind, created_at desc);

-- ---------------------------------------------------------------------------
-- documents: uploaded bloodwork PDFs (Supabase Storage refs)
-- ---------------------------------------------------------------------------
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  path text not null,
  filename text,
  kind text default 'bloodwork',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.signals enable row level security;
alter table public.priors enable row level security;
alter table public.interventions enable row level security;
alter table public.insights enable row level security;
alter table public.documents enable row level security;

-- owner policies (drop-then-create so the script is idempotent)
do $$
declare
  t text;
begin
  foreach t in array array['signals','interventions','insights','documents'] loop
    execute format('drop policy if exists %I on public.%I', t || '_owner_all', t);
    execute format(
      'create policy %I on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t || '_owner_all', t
    );
  end loop;
end$$;

-- priors are shared read-only to all authenticated + anon users
drop policy if exists priors_read_all on public.priors;
create policy priors_read_all on public.priors for select using (true);

-- ---------------------------------------------------------------------------
-- Storage bucket for bloodwork PDFs
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('bloodwork', 'bloodwork', false)
on conflict (id) do nothing;

drop policy if exists "bloodwork owner rw" on storage.objects;
create policy "bloodwork owner rw" on storage.objects
  for all to authenticated
  using (bucket_id = 'bloodwork' and owner = auth.uid())
  with check (bucket_id = 'bloodwork' and owner = auth.uid());

-- ---------------------------------------------------------------------------
-- Grants (Supabase API roles). service_role bypasses RLS but still needs grants.
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

grant select, insert, update, delete on
  public.signals, public.interventions, public.insights, public.documents
  to authenticated;
grant select on public.priors to anon, authenticated;

-- keep future tables accessible
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant all on sequences to service_role;
