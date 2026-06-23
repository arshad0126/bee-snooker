-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Groups Table
create table if not exists public.groups (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    secret_code text not null unique,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Players Table
create table if not exists public.players (
    id uuid default gen_random_uuid() primary key,
    group_id uuid references public.groups(id) on delete cascade not null,
    name text not null,
    photo_url text,
    status text default 'active' check (status in ('active', 'inactive')) not null,
    elo_rating integer default 1000 not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Sessions Table
create table if not exists public.sessions (
    id uuid default gen_random_uuid() primary key,
    group_id uuid references public.groups(id) on delete cascade not null,
    start_time timestamp with time zone default timezone('utc'::text, now()) not null,
    end_time timestamp with time zone,
    duration_seconds integer,
    photos text[] default '{}'::text[] not null,
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Device Controllers Table (Manages who holds write control for a group/session)
create table if not exists public.device_controllers (
    group_id uuid references public.groups(id) on delete cascade primary key,
    controller_device_id uuid not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Frames Table
create table if not exists public.frames (
    id uuid default gen_random_uuid() primary key,
    session_id uuid references public.sessions(id) on delete cascade not null,
    reds_count integer default 15 not null,
    mode text default 'free_for_all' check (mode in ('free_for_all', 'team')) not null,
    status text default 'active' check (status in ('active', 'completed')) not null,
    winner_id uuid references public.players(id), -- For single player wins
    winner_team text check (winner_team in ('team_a', 'team_b')), -- 'team_a' or 'team_b' if team mode
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Frame Players Mapping (Order and Teams)
create table if not exists public.frame_players (
    frame_id uuid references public.frames(id) on delete cascade not null,
    player_id uuid references public.players(id) on delete cascade not null,
    play_order integer not null,
    team_id text check (team_id in ('team_a', 'team_b')),
    is_breaker boolean default false not null,
    primary key (frame_id, player_id)
);

-- Frame Events Table (Immutable Event Log)
create table if not exists public.frame_events (
    id uuid default gen_random_uuid() primary key,
    frame_id uuid references public.frames(id) on delete cascade not null,
    player_id uuid references public.players(id) on delete cascade,
    event_type text check (event_type in ('pot', 'foul', 'undo', 'end_frame', 'reset_frame', 'pass_turn')) not null,
    ball text check (ball in ('red', 'yellow', 'green', 'brown', 'blue', 'pink', 'black')),
    points integer default 0 not null,
    sequence_no integer not null,
    device_info text not null,
    metadata jsonb,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Achievements Table
create table if not exists public.achievements (
    id uuid default gen_random_uuid() primary key,
    group_id uuid references public.groups(id) on delete cascade not null,
    player_id uuid references public.players(id) on delete cascade not null,
    type text not null,
    unlocked_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Helper function to extract secret from HTTP headers
create or replace function public.current_group_secret()
returns text as $$
  select nullif(current_setting('request.headers', true)::json->>'x-group-secret', '');
$$ language sql stable security definer;

-- Enable Row Level Security (RLS) on all tables
alter table public.groups enable row level security;
alter table public.players enable row level security;
alter table public.sessions enable row level security;
alter table public.device_controllers enable row level security;
alter table public.frames enable row level security;
alter table public.frame_players enable row level security;
alter table public.frame_events enable row level security;
alter table public.achievements enable row level security;

-- Drop existing policies if they exist (to ensure safe re-run)
drop policy if exists "Allow read/write group if secret matches" on public.groups;
drop policy if exists "Allow access via group secret" on public.players;
drop policy if exists "Allow access via group secret" on public.sessions;
drop policy if exists "Allow access via group secret" on public.device_controllers;
drop policy if exists "Allow access via group secret" on public.frames;
drop policy if exists "Allow access via group secret" on public.frame_players;
drop policy if exists "Allow access via group secret" on public.frame_events;
drop policy if exists "Allow access via group secret" on public.achievements;

-- Policies for Groups
create policy "Allow read/write group if secret matches" on public.groups
  for all using (secret_code = public.current_group_secret())
  with check (secret_code = public.current_group_secret());

-- Policies for Children Tables (Cascaded access control)
create policy "Allow access via group secret" on public.players
  for all using (group_id in (select id from public.groups where secret_code = public.current_group_secret()));

create policy "Allow access via group secret" on public.sessions
  for all using (group_id in (select id from public.groups where secret_code = public.current_group_secret()));

create policy "Allow access via group secret" on public.device_controllers
  for all using (group_id in (select id from public.groups where secret_code = public.current_group_secret()));

create policy "Allow access via group secret" on public.frames
  for all using (session_id in (select id from public.sessions where group_id in (select id from public.groups where secret_code = public.current_group_secret())));

create policy "Allow access via group secret" on public.frame_players
  for all using (frame_id in (select id from public.frames where session_id in (select id from public.sessions where group_id in (select id from public.groups where secret_code = public.current_group_secret()))));

create policy "Allow access via group secret" on public.frame_events
  for all using (frame_id in (select id from public.frames where session_id in (select id from public.sessions where group_id in (select id from public.groups where secret_code = public.current_group_secret()))));

create policy "Allow access via group secret" on public.achievements
  for all using (group_id in (select id from public.groups where secret_code = public.current_group_secret()));

-- Enable Realtime for frame_events and device_controllers to support live scoreboard syncing
begin;
  alter publication supabase_realtime add table public.frame_events;
  alter publication supabase_realtime add table public.device_controllers;
commit;

