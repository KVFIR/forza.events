-- Host balance: move active non-leader racers between groups.

create or replace function apply_event_group_moves(
  p_event_id uuid,
  p_moves jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event       events%rowtype;
  v_move        jsonb;
  v_discord_id  text;
  v_to_group    smallint;
  v_from_group  smallint;
  v_is_leader   boolean;
  v_waitlisted  boolean;
  v_count       int;
  v_g           smallint;
  v_group_cap   smallint;
  v_results     jsonb := '[]'::jsonb;
begin
  if p_moves is null or jsonb_typeof(p_moves) <> 'array' then
    raise exception 'BAD_REQUEST';
  end if;

  select * into v_event
  from events
  where id = p_event_id
  for update;

  if not found or v_event.status = 'draft' then
    raise exception 'EVENT_NOT_FOUND';
  end if;

  if v_event.status in ('cancelled', 'completed', 'archived') then
    raise exception 'REGISTRATION_CLOSED';
  end if;

  if v_event.status in ('live', 'checkin') then
    raise exception 'REGISTRATION_AFTER_START';
  end if;

  if v_event.starts_at <= now() then
    raise exception 'REGISTRATION_AFTER_START';
  end if;

  v_group_cap := coalesce(v_event.group_count, 1::smallint);

  for v_move in select value from jsonb_array_elements(p_moves)
  loop
    v_discord_id := trim(coalesce(v_move->>'discord_id', ''));
    begin
      v_to_group := (v_move->>'group_index')::smallint;
    exception
      when others then
        raise exception 'INVALID_GROUP_INDEX';
    end;

    if v_discord_id = '' then
      raise exception 'BAD_REQUEST';
    end if;

    if v_to_group is null or v_to_group < 1 or v_to_group > v_group_cap then
      raise exception 'INVALID_GROUP_INDEX';
    end if;

    select
      group_index,
      coalesce(is_convoy_leader, false),
      coalesce(waitlisted, false)
    into v_from_group, v_is_leader, v_waitlisted
    from event_participants
    where event_id = p_event_id
      and discord_id = v_discord_id;

    if not found then
      raise exception 'BAD_REQUEST';
    end if;

    if v_waitlisted then
      raise exception 'BAD_REQUEST';
    end if;

    if v_is_leader then
      raise exception 'LEADER_CANNOT_MOVE';
    end if;

    if v_from_group = v_to_group then
      continue;
    end if;

    update event_participants
    set group_index = v_to_group
    where event_id = p_event_id
      and discord_id = v_discord_id;

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'discord_id', v_discord_id,
        'from_group', v_from_group,
        'to_group', v_to_group
      )
    );
  end loop;

  for v_g in 1..v_group_cap
  loop
    select count(*)::int into v_count
    from event_participants
    where event_id = p_event_id
      and group_index = v_g
      and not coalesce(waitlisted, false);

    if v_count > v_event.max_players then
      raise exception 'EVENT_FULL';
    end if;
  end loop;

  return v_results;
end;
$$;

revoke all on function apply_event_group_moves(uuid, jsonb) from public;
grant execute on function apply_event_group_moves(uuid, jsonb) to service_role;
