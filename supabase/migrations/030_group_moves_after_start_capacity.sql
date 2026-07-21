-- Shuffle/balance/balance_shuffle apply: allow after event start (until finalized).
-- Skip per-row capacity mid-apply so near-full/full rematches can land; still validate finals.

create or replace function enforce_event_participant_capacity()
returns trigger
language plpgsql
as $$
declare
  v_max    int;
  v_active int;
begin
  -- Transaction-local escape for apply_event_group_moves (final sizes checked there).
  if current_setting('forza.skip_participant_capacity', true) = 'on' then
    return new;
  end if;

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
    and group_index = new.group_index
    and not coalesce(waitlisted, false)
    and discord_id is distinct from new.discord_id;

  if v_active >= v_max then
    raise exception 'EVENT_FULL';
  end if;

  return new;
end;
$$;

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

  -- After-start allowed for host reseats (balance / shuffle / balance_shuffle).
  -- Join/leave and other edits still lock at start in their own Edge/RPC paths.

  v_group_cap := coalesce(v_event.group_count, 1::smallint);

  perform set_config('forza.skip_participant_capacity', 'on', true);

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
