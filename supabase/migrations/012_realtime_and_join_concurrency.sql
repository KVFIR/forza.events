-- Realtime: lobby counts and participant lists sync across clients.
-- Concurrency: serialize joins per event so capacity cannot be exceeded under race.

do $$
begin
  alter publication supabase_realtime add table public.events;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.event_participants;
exception
  when duplicate_object then null;
end $$;

create or replace function enforce_event_participant_capacity()
returns trigger
language plpgsql
as $$
declare
  v_max int;
  v_active int;
begin
  if coalesce(new.waitlisted, false) then
    return new;
  end if;

  select max_players into v_max
  from events
  where id = new.event_id
  for update;

  if v_max is null then
    raise exception 'EVENT_NOT_FOUND';
  end if;

  select count(*)::int into v_active
  from event_participants
  where event_id = new.event_id
    and not waitlisted
    and discord_id is distinct from new.discord_id;

  if v_active >= v_max then
    raise exception 'EVENT_FULL';
  end if;

  return new;
end;
$$;

drop trigger if exists ep_capacity_enforcement on event_participants;
create trigger ep_capacity_enforcement
  before insert on event_participants
  for each row
  execute function enforce_event_participant_capacity();
