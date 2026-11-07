-- Shadow Fight core schema. Run in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.game_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null default 'Fighter' check (char_length(username) between 2 and 24),
  level integer not null default 1 check (level between 1 and 1000),
  experience bigint not null default 0 check (experience >= 0),
  wins integer not null default 0 check (wins >= 0),
  losses integer not null default 0 check (losses >= 0),
  streak integer not null default 0 check (streak >= 0),
  coins bigint not null default 0 check (coins >= 0),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_matches (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.game_profiles(id) on delete cascade,
  mode text not null check (mode in ('quick','ranked','training')),
  opponent text not null default 'Shadow Bot',
  result text not null default 'pending' check (result in ('pending','won','lost','draw')),
  duration_seconds integer check (duration_seconds is null or duration_seconds between 0 and 3600),
  replay_path text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.game_inventory (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.game_profiles(id) on delete cascade,
  item_key text not null,
  item_type text not null check (item_type in ('weapon','armor','ability','cosmetic')),
  equipped boolean not null default false,
  acquired_at timestamptz not null default now(),
  unique(player_id, item_key)
);

create index if not exists game_matches_player_created_idx on public.game_matches(player_id, created_at desc);
create index if not exists game_profiles_leaderboard_idx on public.game_profiles(wins desc, level desc, experience desc);
create index if not exists game_inventory_player_idx on public.game_inventory(player_id);

alter table public.game_profiles enable row level security;
alter table public.game_matches enable row level security;
alter table public.game_inventory enable row level security;

drop policy if exists "Profiles are readable by everyone" on public.game_profiles;
create policy "Profiles are readable by everyone" on public.game_profiles for select using (true);
drop policy if exists "Players create their own profile" on public.game_profiles;
create policy "Players create their own profile" on public.game_profiles for insert with check (auth.uid() = id);

drop policy if exists "Players read their own matches" on public.game_matches;
create policy "Players read their own matches" on public.game_matches for select using (auth.uid() = player_id);
drop policy if exists "Players create their own matches" on public.game_matches;
create policy "Players create their own matches" on public.game_matches for insert with check (auth.uid() = player_id);

drop policy if exists "Players read their own inventory" on public.game_inventory;
create policy "Players read their own inventory" on public.game_inventory for select using (auth.uid() = player_id);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists game_profiles_updated_at on public.game_profiles;
create trigger game_profiles_updated_at before update on public.game_profiles for each row execute function public.set_updated_at();

-- Automatically provision a profile when a player signs up.
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.game_profiles (id, username)
  values (new.id, case when char_length(coalesce(nullif(new.raw_user_meta_data ->> 'username',''), split_part(coalesce(new.email,'fighter'), '@', 1))) < 2 then 'Fighter' else left(coalesce(nullif(new.raw_user_meta_data ->> 'username',''), split_part(coalesce(new.email,'fighter'), '@', 1)), 24) end)
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created_shadow_profile on auth.users;
create trigger on_auth_user_created_shadow_profile after insert on auth.users for each row execute procedure public.handle_new_user();
