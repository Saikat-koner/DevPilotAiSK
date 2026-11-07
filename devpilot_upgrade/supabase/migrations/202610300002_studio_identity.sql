-- Shadow Forge identity and per-user Code Studio history.
-- Run in the Supabase SQL Editor after configuring Auth.
create table if not exists public.forge_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.studio_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  prompt text not null check (char_length(prompt) between 1 and 12000),
  stack text,
  summary text,
  file_count integer not null default 0 check (file_count >= 0),
  created_at timestamptz not null default now()
);

create index if not exists studio_generations_user_created_idx
  on public.studio_generations(user_id, created_at desc);

alter table public.forge_profiles enable row level security;
alter table public.studio_generations enable row level security;

drop policy if exists "Users read own forge profile" on public.forge_profiles;
create policy "Users read own forge profile" on public.forge_profiles
  for select to authenticated using (auth.uid() = id);
drop policy if exists "Users create own forge profile" on public.forge_profiles;
create policy "Users create own forge profile" on public.forge_profiles
  for insert to authenticated with check (auth.uid() = id);
drop policy if exists "Users update own forge profile" on public.forge_profiles;
create policy "Users update own forge profile" on public.forge_profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Users read own generations" on public.studio_generations;
create policy "Users read own generations" on public.studio_generations
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users create own generations" on public.studio_generations;
create policy "Users create own generations" on public.studio_generations
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users delete own generations" on public.studio_generations;
create policy "Users delete own generations" on public.studio_generations
  for delete to authenticated using (auth.uid() = user_id);

grant select, insert, update on public.forge_profiles to authenticated;
grant select, insert, delete on public.studio_generations to authenticated;
