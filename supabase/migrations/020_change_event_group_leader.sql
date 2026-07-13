-- Host reassigns convoy leader for an existing group (published events; all group indices).

create or replace function change_event_group_leader(
  p_event_id uuid,
  p_group_index smallint,
  p_leader_discord_id text,
  p_leader_gamertag text,
  p_participation_source text default 'host_assigned'
)
returns smallint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event             events%rowtype;
  v_group_cap         smallint;
  v_current_leader    text;
  v_old_leader_source text;
  v_old_group         smallint;
  v_was_active        boolean := false;
  v_was_waitlisted    boolean := false;
  v_was_convoy_leader boolean := false;
  v_active_in_group   int;
  v_already_in_group  boolean;
begin
  if p_leader_discord_id is null or trim(p_leader_discord_id) = '' then
    raise exception 'BAD_REQUEST';
  end if;
  if p_leader_gamertag is null or trim(p_leader_gamertag) = '' then
    raise exception 'BAD_REQUEST';
  end if;
  if p_group_index is null or p_group_index < 1 then
    raise exception 'INVALID_GROUP_INDEX';
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
  if p_group_index > v_group_cap then
    raise exception 'INVALID_GROUP_INDEX';
  end if;

  select discord_id into v_current_leader
  from event_participants
  where event_id = p_event_id
    and group_index = p_group_index
    and coalesce(is_convoy_leader, false)
    and not coalesce(waitlisted, false);

  if v_current_leader is not null and v_current_leader = trim(p_leader_discord_id) then
    return p_group_index;
  end if;

  select
    group_index,
    not coalesce(waitlisted, false),
    coalesce(waitlisted, false),
    coalesce(is_convoy_leader, false)
  into v_old_group, v_was_active, v_was_waitlisted, v_was_convoy_leader
  from event_participants
  where event_id = p_event_id
    and discord_id = trim(p_leader_discord_id);

  if v_was_convoy_leader and v_was_active and coalesce(v_old_group, 0) <> p_group_index then
    raise exception 'LEADER_ALREADY_CONVOY_LEADER';
  end if;

  select participation_source into v_old_leader_source
  from event_participants
  where event_id = p_event_id
    and group_index = p_group_index
    and coalesce(is_convoy_leader, false)
    and not coalesce(waitlisted, false);

  if found then
    if v_old_leader_source = 'self_join' then
      update event_participants
      set is_convoy_leader = false
      where event_id = p_event_id
        and group_index = p_group_index
        and coalesce(is_convoy_leader, false)
        and not coalesce(waitlisted, false);
    else
      delete from event_participants
      where event_id = p_event_id
        and group_index = p_group_index
        and coalesce(is_convoy_leader, false)
        and not coalesce(waitlisted, false);
    end if;
  end if;

  select count(*)::int into v_active_in_group
  from event_participants
  where event_id = p_event_id
    and group_index = p_group_index
    and not coalesce(waitlisted, false);

  select exists(
    select 1
    from event_participants
    where event_id = p_event_id
      and discord_id = trim(p_leader_discord_id)
      and group_index = p_group_index
      and not coalesce(waitlisted, false)
      and not coalesce(is_convoy_leader, false)
  ) into v_already_in_group;

  if not v_already_in_group and v_active_in_group >= v_event.max_players then
    raise exception 'EVENT_FULL';
  end if;

  insert into event_participants (
    event_id,
    discord_id,
    gamertag_snapshot,
    waitlisted,
    group_index,
    is_convoy_leader,
    participation_source
  )
  values (
    p_event_id,
    trim(p_leader_discord_id),
    trim(p_leader_gamertag),
    false,
    p_group_index,
    true,
    coalesce(nullif(trim(p_participation_source), ''), 'host_assigned')
  )
  on conflict (event_id, discord_id) do update set
    gamertag_snapshot = excluded.gamertag_snapshot,
    waitlisted = false,
    group_index = p_group_index,
    is_convoy_leader = true,
    participation_source = case
      when event_participants.participation_source = 'self_join' then 'self_join'
      else excluded.participation_source
    end;

  if v_was_active and not v_was_waitlisted and v_old_group is not null and v_old_group <> p_group_index then
    perform promote_waitlist_to_group(p_event_id, v_old_group);
  end if;

  if p_group_index = 1 then
    update events
    set
      lobby_leader_discord_id = trim(p_leader_discord_id),
      lobby_leader_is_host = (trim(p_leader_discord_id) = v_event.host_discord_id),
      lobby_leader_gamertag = trim(p_leader_gamertag)
    where id = p_event_id;
  end if;

  return p_group_index;
end;
$$;

create or replace function change_event_group_leader(
  p_event_id uuid,
  p_group_index integer,
  p_leader_discord_id text,
  p_leader_gamertag text,
  p_participation_source text default 'host_assigned'
)
returns smallint
language plpgsql
security definer
set search_path = public
as $$
begin
  return change_event_group_leader(
    p_event_id,
    p_group_index::smallint,
    p_leader_discord_id,
    p_leader_gamertag,
    p_participation_source
  );
end;
$$;

revoke all on function change_event_group_leader(uuid, smallint, text, text, text) from public;
grant execute on function change_event_group_leader(uuid, smallint, text, text, text) to service_role;

revoke all on function change_event_group_leader(uuid, integer, text, text, text) from public;
grant execute on function change_event_group_leader(uuid, integer, text, text, text) to service_role;
