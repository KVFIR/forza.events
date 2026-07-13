-- add_event_group: allow host to open the next group when every active group is full,
-- even with an empty waitlist (proactive 12/24/36… capacity).

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
  v_fill_ids   text[];
  v_g          smallint;
  v_active     int;
  v_group_cap  smallint;
  v_old_group  smallint;
  v_was_active boolean := false;
  v_was_waitlisted boolean := false;
  v_was_convoy_leader boolean := false;
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

  v_group_cap := coalesce(v_event.group_count, 1::smallint);

  if v_group_cap >= 5 then
    raise exception 'GROUPS_MAXED';
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

  if v_was_convoy_leader and v_was_active then
    raise exception 'LEADER_ALREADY_CONVOY_LEADER';
  end if;

  for v_g in 1..v_group_cap loop
    select count(*)::int into v_active
    from event_participants
    where event_id = p_event_id
      and group_index = v_g
      and not coalesce(waitlisted, false);

    if v_active < v_event.max_players then
      raise exception 'LOBBY_NOT_FULL';
    end if;
  end loop;

  v_new_group := v_group_cap + 1;

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
    participation_source = case
      when event_participants.participation_source = 'self_join' then 'self_join'
      else excluded.participation_source
    end;

  if v_was_active and not v_was_waitlisted and v_old_group is not null and v_old_group < v_new_group then
    perform promote_waitlist_to_group(p_event_id, v_old_group);
  end if;

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

-- ponytail: self-check — add_event_group must not require a waitlist (018).
do $check$
declare
  v_def text;
begin
  select pg_get_functiondef('add_event_group(uuid, text, text, text)'::regprocedure) into v_def;
  if v_def ~ 'WAITLIST_EMPTY' then
    raise exception 'add_event_group still raises WAITLIST_EMPTY';
  end if;
end;
$check$;
