-- Safe migration to update event_type check constraint in frame_events
do $$
declare
    constraint_name text;
begin
    -- Find the check constraint on event_type column
    select con.conname into constraint_name
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'frame_events'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) like '%event_type%';

    if constraint_name is not null then
        execute 'alter table public.frame_events drop constraint ' || quote_ident(constraint_name);
    end if;
end $$;

-- Add updated check constraint allowing 'pass_turn'
alter table public.frame_events add constraint frame_events_event_type_check 
  check (event_type in ('pot', 'foul', 'undo', 'end_frame', 'reset_frame', 'pass_turn'));
