-- Mealhack — accounts & personalization (Milestone 2).
-- Run in the Supabase SQL editor (or `supabase db push`).

-- Saved recipes: full snapshots (payload) since generated ids are per-run.
create table if not exists public.saved_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  recipe_id text not null,
  title text not null,
  total_minutes int,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, recipe_id)
);

alter table public.saved_recipes enable row level security;

drop policy if exists "own saved recipes" on public.saved_recipes;
create policy "own saved recipes" on public.saved_recipes
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists saved_recipes_user_idx
  on public.saved_recipes (user_id, created_at desc);

-- Default cooking preferences, one row per user.
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  preferences jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

drop policy if exists "own preferences" on public.user_preferences;
create policy "own preferences" on public.user_preferences
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Note: account deletion runs server-side with the service-role key
-- (/api/account/delete). Row-level security above means the browser client can
-- only ever read/write the signed-in user's own rows.
