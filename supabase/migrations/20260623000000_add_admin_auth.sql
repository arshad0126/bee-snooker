-- Add owner_id column to groups table
alter table public.groups add column if not exists owner_id uuid references auth.users(id);

-- Re-create RLS Policies to enforce owner permissions
-- Drop existing policies
drop policy if exists "Allow read/write group if secret matches" on public.groups;
drop policy if exists "Allow access via group secret" on public.players;
drop policy if exists "Allow access via group secret" on public.sessions;
drop policy if exists "Allow access via group secret" on public.device_controllers;
drop policy if exists "Allow access via group secret" on public.frames;
drop policy if exists "Allow access via group secret" on public.frame_players;
drop policy if exists "Allow access via group secret" on public.frame_events;
drop policy if exists "Allow access via group secret" on public.achievements;

-- Policy for Groups Table
create policy "Allow group selection by secret or owner" on public.groups
  for select using (secret_code = public.current_group_secret() or auth.uid() = owner_id);

create policy "Allow group insertion by authenticated users" on public.groups
  for insert with check (auth.uid() is not null);

create policy "Allow group modification by owner" on public.groups
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Policies for Children Tables (Cascaded access control)
-- Players
create policy "Allow player selection by secret or owner" on public.players
  for select using (
    group_id in (select id from public.groups where secret_code = public.current_group_secret()) 
    or group_id in (select id from public.groups where owner_id = auth.uid())
  );

create policy "Allow player modification by owner" on public.players
  for all using (
    group_id in (select id from public.groups where owner_id = auth.uid())
  );

-- Sessions
create policy "Allow session selection by secret or owner" on public.sessions
  for select using (
    group_id in (select id from public.groups where secret_code = public.current_group_secret()) 
    or group_id in (select id from public.groups where owner_id = auth.uid())
  );

create policy "Allow session modification by owner" on public.sessions
  for all using (
    group_id in (select id from public.groups where owner_id = auth.uid())
  );

-- Device Controllers
create policy "Allow controller selection by secret or owner" on public.device_controllers
  for select using (
    group_id in (select id from public.groups where secret_code = public.current_group_secret()) 
    or group_id in (select id from public.groups where owner_id = auth.uid())
  );

create policy "Allow controller modification by owner" on public.device_controllers
  for all using (
    group_id in (select id from public.groups where owner_id = auth.uid())
  );

-- Frames
create policy "Allow frame selection by secret or owner" on public.frames
  for select using (
    session_id in (
      select id from public.sessions where 
        group_id in (select id from public.groups where secret_code = public.current_group_secret())
        or group_id in (select id from public.groups where owner_id = auth.uid())
    )
  );

create policy "Allow frame modification by owner" on public.frames
  for all using (
    session_id in (
      select id from public.sessions where group_id in (select id from public.groups where owner_id = auth.uid())
    )
  );

-- Frame Players
create policy "Allow frame_player selection by secret or owner" on public.frame_players
  for select using (
    frame_id in (
      select id from public.frames where session_id in (
        select id from public.sessions where 
          group_id in (select id from public.groups where secret_code = public.current_group_secret())
          or group_id in (select id from public.groups where owner_id = auth.uid())
      )
    )
  );

create policy "Allow frame_player modification by owner" on public.frame_players
  for all using (
    frame_id in (
      select id from public.frames where session_id in (
        select id from public.sessions where group_id in (select id from public.groups where owner_id = auth.uid())
      )
    )
  );

-- Frame Events
create policy "Allow event selection by secret or owner" on public.frame_events
  for select using (
    frame_id in (
      select id from public.frames where session_id in (
        select id from public.sessions where 
          group_id in (select id from public.groups where secret_code = public.current_group_secret())
          or group_id in (select id from public.groups where owner_id = auth.uid())
      )
    )
  );

create policy "Allow event modification by owner" on public.frame_events
  for all using (
    frame_id in (
      select id from public.frames where session_id in (
        select id from public.sessions where group_id in (select id from public.groups where owner_id = auth.uid())
      )
    )
  );

-- Achievements
create policy "Allow achievement selection by secret or owner" on public.achievements
  for select using (
    group_id in (select id from public.groups where secret_code = public.current_group_secret()) 
    or group_id in (select id from public.groups where owner_id = auth.uid())
  );

create policy "Allow achievement modification by owner" on public.achievements
  for all using (
    group_id in (select id from public.groups where owner_id = auth.uid())
  );
