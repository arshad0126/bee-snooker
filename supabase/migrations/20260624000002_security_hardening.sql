-- Security Hardening & RLS Lockout Fixes Migration
-- Permitting modification access to users presenting a valid group secret code

-- Drop existing owner-only modification policies to re-create them with secret code access
drop policy if exists "Allow group insertion by authenticated users" on public.groups;
drop policy if exists "Allow group modification by owner" on public.groups;

drop policy if exists "Allow player modification by owner" on public.players;
drop policy if exists "Allow session modification by owner" on public.sessions;
drop policy if exists "Allow controller modification by owner" on public.device_controllers;
drop policy if exists "Allow frame modification by owner" on public.frames;
drop policy if exists "Allow frame_player modification by owner" on public.frame_players;
drop policy if exists "Allow event modification by owner" on public.frame_events;
drop policy if exists "Allow achievement modification by owner" on public.achievements;

-- 1. Groups Table Policies
create policy "Allow group insertion by authenticated users" on public.groups
  for insert with check (auth.uid() is not null and (owner_id = auth.uid() or owner_id is null));

create policy "Allow group modification by owner" on public.groups
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- 2. Players Table Policies (Select is already "Allow player selection by secret or owner")
create policy "Allow player modification by secret or owner" on public.players
  for all using (
    group_id in (select id from public.groups where secret_code = public.current_group_secret() or owner_id = auth.uid())
  ) with check (
    group_id in (select id from public.groups where secret_code = public.current_group_secret() or owner_id = auth.uid())
  );

-- 3. Sessions Table Policies (Select is already "Allow session selection by secret or owner")
create policy "Allow session modification by secret or owner" on public.sessions
  for all using (
    group_id in (select id from public.groups where secret_code = public.current_group_secret() or owner_id = auth.uid())
  ) with check (
    group_id in (select id from public.groups where secret_code = public.current_group_secret() or owner_id = auth.uid())
  );

-- 4. Device Controllers Table Policies (Select is already "Allow controller selection by secret or owner")
create policy "Allow controller modification by secret or owner" on public.device_controllers
  for all using (
    group_id in (select id from public.groups where secret_code = public.current_group_secret() or owner_id = auth.uid())
  ) with check (
    group_id in (select id from public.groups where secret_code = public.current_group_secret() or owner_id = auth.uid())
  );

-- 5. Frames Table Policies (Select is already "Allow frame selection by secret or owner")
create policy "Allow frame modification by secret or owner" on public.frames
  for all using (
    session_id in (
      select id from public.sessions where 
        group_id in (select id from public.groups where secret_code = public.current_group_secret())
        or group_id in (select id from public.groups where owner_id = auth.uid())
    )
  ) with check (
    session_id in (
      select id from public.sessions where 
        group_id in (select id from public.groups where secret_code = public.current_group_secret())
        or group_id in (select id from public.groups where owner_id = auth.uid())
    )
  );

-- 6. Frame Players Table Policies (Select is already "Allow frame_player selection by secret or owner")
create policy "Allow frame_player modification by secret or owner" on public.frame_players
  for all using (
    frame_id in (
      select id from public.frames where session_id in (
        select id from public.sessions where 
          group_id in (select id from public.groups where secret_code = public.current_group_secret())
          or group_id in (select id from public.groups where owner_id = auth.uid())
      )
    )
  ) with check (
    frame_id in (
      select id from public.frames where session_id in (
        select id from public.sessions where 
          group_id in (select id from public.groups where secret_code = public.current_group_secret())
          or group_id in (select id from public.groups where owner_id = auth.uid())
      )
    )
  );

-- 7. Frame Events Table Policies (Select is already "Allow event selection by secret or owner")
create policy "Allow event modification by secret or owner" on public.frame_events
  for all using (
    frame_id in (
      select id from public.frames where session_id in (
        select id from public.sessions where 
          group_id in (select id from public.groups where secret_code = public.current_group_secret())
          or group_id in (select id from public.groups where owner_id = auth.uid())
      )
    )
  ) with check (
    frame_id in (
      select id from public.frames where session_id in (
        select id from public.sessions where 
          group_id in (select id from public.groups where secret_code = public.current_group_secret())
          or group_id in (select id from public.groups where owner_id = auth.uid())
      )
    )
  );

-- 8. Achievements Table Policies (Select is already "Allow achievement selection by secret or owner")
create policy "Allow achievement modification by secret or owner" on public.achievements
  for all using (
    group_id in (select id from public.groups where secret_code = public.current_group_secret() or owner_id = auth.uid())
  ) with check (
    group_id in (select id from public.groups where secret_code = public.current_group_secret() or owner_id = auth.uid())
  );
