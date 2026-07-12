-- add_event_group: reject when active groups still have open seats (LOBBY_NOT_FULL).
-- Applied after 008 on remote; do not edit 008 in place.

create or replace function add_event_group(
  p_event_id uuid,
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
  v_event      events%rowtype;
  v_new_group  smallint;
  v_waitlisted int;
  v_fill_ids   text[];
  v_g          smallint;
  v_active     int;
begin
  if p_leader_discord_id is null or trim(p_leader_discord_id) = '' then
    raise exception 'BAD_REQUEST';
  end if;
  if p_leader_gamertag is null or trim(p_leader_gamertag) = '' then
    raise exception 'BAD_REQUEST';
  end if;

  select * into v_event
  from events
  where id = p_event_id
  for update;

  if not found or v_event.status = 'draft' then
    raise exception 'EVENT_NOT_FOUND';
  end if;

  if coalesce(v_event.group_count, 1) >= 5 then
    raise exception 'GROUPS_MAXED';
  end if;

  select count(*)::int into v_waitlisted
  from event_participants
  where event_id = p_event_id
    and coalesce(waitlisted, false);

  if v_waitlisted < 1 then
    raise exception 'WAITLIST_EMPTY';
  end if;

  for v_g in 1..coalesce(v_event.group_count, 1) loop
    select count(*)::int into v_active
    from event_participants
    where event_id = p_event_id
      and group_index = v_g
      and not coalesce(waitlisted, false);

    if v_active < v_event.max_players then
      raise exception 'LOBBY_NOT_FULL';
    end if;
  end loop;

  v_new_group := coalesce(v_event.group_count, 1) + 1;

  update events
  set group_count = v_new_group
  where id = p_event_id;

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
    v_new_group,
    true,
    coalesce(nullif(trim(p_participation_source), ''), 'host_assigned')
  )
  on conflict (event_id, discord_id) do update set
    gamertag_snapshot = excluded.gamertag_snapshot,
    waitlisted = false,
    group_index = v_new_group,
    is_convoy_leader = true,
    participation_source = excluded.participation_source;

  select array_agg(discord_id order by joined_at asc) into v_fill_ids
  from (
    select discord_id, joined_at
    from event_participants
    where event_id = p_event_id
      and coalesce(waitlisted, false)
      and discord_id is distinct from trim(p_leader_discord_id)
    order by joined_at asc
    limit greatest(0, v_event.max_players - 1)
  ) q;

  if v_fill_ids is not null and array_length(v_fill_ids, 1) > 0 then
    update event_participants
    set waitlisted = false,
        group_index = v_new_group,
        is_convoy_leader = false
    where event_id = p_event_id
      and discord_id = any (v_fill_ids);
  end if;

  return v_new_group;
end;
$$;
