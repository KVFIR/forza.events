-- Reject active participants whose group_index falls outside events.group_count.

create or replace function enforce_participant_group_index()
returns trigger language plpgsql as $$
declare
  v_group_count smallint;
begin
  if coalesce(new.waitlisted, false) then
    return new;
  end if;

  select coalesce(group_count, 1) into v_group_count
  from events
  where id = new.event_id;

  if v_group_count is null then
    raise exception 'EVENT_NOT_FOUND';
  end if;

  if new.group_index < 1 or new.group_index > v_group_count then
    raise exception 'INVALID_GROUP_INDEX';
  end if;

  return new;
end;
$$;

drop trigger if exists event_participants_group_index_check on event_participants;
create trigger event_participants_group_index_check
  before insert or update on event_participants
  for each row execute function enforce_participant_group_index();
