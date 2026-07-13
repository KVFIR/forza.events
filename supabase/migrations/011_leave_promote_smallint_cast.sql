-- Fix leave_event_participant: coalesce(..., 1) inferred integer, but promote_waitlist_to_group expects smallint.

create or replace function leave_event_participant(
  p_event_id uuid,
  p_discord_id text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_index smallint;
  v_waitlisted  boolean;
  v_is_leader   boolean;
begin
  select group_index, coalesce(waitlisted, false), coalesce(is_convoy_leader, false)
  into v_group_index, v_waitlisted, v_is_leader
  from event_participants
  where event_id = p_event_id
    and discord_id = p_discord_id
  for update;

  if not found then
    return false;
  end if;

  if v_is_leader then
    raise exception 'LEADER_CANNOT_LEAVE';
  end if;

  delete from event_participants
  where event_id = p_event_id
    and discord_id = p_discord_id;

  if not v_waitlisted then
    perform promote_waitlist_to_group(p_event_id, coalesce(v_group_index, 1::smallint));
  end if;

  return true;
end;
$$;
