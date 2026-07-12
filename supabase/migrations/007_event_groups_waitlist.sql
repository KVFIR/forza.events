-- Waitlist + multi-group lobbies.
-- events.max_players (12) is now capacity **per group**; total = group_count * max_players.
-- A group has its own convoy leader; groups 2..MAX_GROUPS are added incrementally by the host
-- while the waitlist is non-empty. MAX_GROUPS = 5 (max 60 racers).

-- ============================================================
-- COLUMNS
-- ============================================================
alter table events
  add column if not exists group_count smallint not null default 1;

alter table events
  drop constraint if exists events_group_count_check;
alter table events
  add constraint events_group_count_check check (group_count between 1 and 5);

-- group_index is meaningful only when waitlisted = false; the queue (waitlisted = true)
-- is ordered by joined_at.
alter table event_participants
  add column if not exists group_index smallint not null default 1;

alter table event_results
  add column if not exists group_index smallint not null default 1;

-- ============================================================
-- PER-GROUP UNIQUE INDEXES
-- ============================================================
-- One convoy leader per group (was one per event).
drop index if exists ep_one_convoy_leader_per_event_idx;
create unique index ep_one_convoy_leader_per_event_idx
  on event_participants (event_id, group_index) where is_convoy_leader = true;

-- Finishing positions restart per group (was unique per event).
drop index if exists event_results_event_finish_position_idx;
create unique index event_results_event_finish_position_idx
  on event_results using btree (event_id, group_index, position) where position is not null;

-- ============================================================
-- CAPACITY TRIGGER — per group
-- ============================================================
create or replace function enforce_event_participant_capacity()
returns trigger language plpgsql as $$
declare
  v_max    int;
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
    and group_index = new.group_index
    and not coalesce(waitlisted, false)
    and discord_id is distinct from new.discord_id;

  if v_active >= v_max then
    raise exception 'EVENT_FULL';
  end if;

  return new;
end;
$$;

-- ============================================================
-- COUNT TRIGGERS — handle waitlisted true<->false on UPDATE (promotion / auto-fill)
-- ============================================================
create or replace function update_current_players()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' and not new.waitlisted then
    update events set current_players = current_players + 1 where id = new.event_id;
  elsif tg_op = 'DELETE' and not old.waitlisted then
    update events set current_players = current_players - 1 where id = old.event_id;
  elsif tg_op = 'UPDATE' then
    if coalesce(old.waitlisted, false) and not coalesce(new.waitlisted, false) then
      update events set current_players = current_players + 1 where id = new.event_id;
    elsif not coalesce(old.waitlisted, false) and coalesce(new.waitlisted, false) then
      update events set current_players = current_players - 1 where id = new.event_id;
    end if;
  end if;
  return null;
end;
$$;

create or replace function sync_user_events_joined()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' and not coalesce(new.waitlisted, false) then
    update users
    set events_joined = events_joined + 1
    where discord_id = new.discord_id;
  elsif tg_op = 'DELETE' and not coalesce(old.waitlisted, false) then
    update users
    set events_joined = greatest(0, events_joined - 1)
    where discord_id = old.discord_id;
  elsif tg_op = 'UPDATE' then
    if coalesce(old.waitlisted, false) and not coalesce(new.waitlisted, false) then
      update users
      set events_joined = events_joined + 1
      where discord_id = new.discord_id;
    elsif not coalesce(old.waitlisted, false) and coalesce(new.waitlisted, false) then
      update users
      set events_joined = greatest(0, events_joined - 1)
      where discord_id = new.discord_id;
    end if;
  end if;
  return null;
end;
$$;

-- Fire count/sync triggers on UPDATE too (were INSERT/DELETE only).
drop trigger if exists ep_count_trigger on event_participants;
create trigger ep_count_trigger
  after insert or update or delete on event_participants
  for each row execute function update_current_players();

drop trigger if exists ep_sync_user_events_joined on event_participants;
create trigger ep_sync_user_events_joined
  after insert or update or delete on event_participants
  for each row execute function sync_user_events_joined();

-- ============================================================
-- RESULTS RPC — accept per-group rows
-- ============================================================
create or replace function submit_event_results(
  p_event_id uuid,
  p_host_discord_id text,
  p_results jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event events%rowtype;
  v_row record;
begin
  if p_results is null
    or jsonb_typeof(p_results) <> 'array'
    or jsonb_array_length(p_results) = 0
  then
    raise exception 'BAD_REQUEST';
  end if;

  select * into v_event
  from events
  where id = p_event_id
  for update;

  if not found then
    raise exception 'EVENT_NOT_FOUND';
  end if;

  if v_event.host_discord_id is distinct from p_host_discord_id then
    raise exception 'FORBIDDEN';
  end if;

  if v_event.status in ('completed', 'cancelled', 'archived') then
    raise exception 'RESULTS_ALREADY_SUBMITTED';
  end if;

  if v_event.status = 'draft' then
    raise exception 'EVENT_NOT_FOUND';
  end if;

  if not (
    v_event.status in ('live', 'checkin')
    or v_event.starts_at <= now()
  ) then
    raise exception 'BAD_REQUEST';
  end if;

  if exists (
    select 1 from event_results where event_id = p_event_id
  ) then
    raise exception 'RESULTS_ALREADY_SUBMITTED';
  end if;

  for v_row in
    select *
    from jsonb_to_recordset(p_results) as x(
      discord_id text,
      position integer,
      dnf boolean,
      dns boolean,
      group_index smallint
    )
  loop
    if v_row.discord_id is null or trim(v_row.discord_id) = '' then
      raise exception 'BAD_REQUEST';
    end if;

    insert into event_results (event_id, discord_id, position, dnf, dns, points, group_index)
    values (
      p_event_id,
      trim(v_row.discord_id),
      v_row.position,
      coalesce(v_row.dnf, false),
      coalesce(v_row.dns, false),
      null,
      coalesce(v_row.group_index, 1)
    );
  end loop;

  update events
  set status = 'completed'
  where id = p_event_id;
end;
$$;
