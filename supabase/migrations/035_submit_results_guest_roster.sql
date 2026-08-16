-- Host may record results for guild members who never joined (and promote waitlisted).
-- Skip per-group capacity so a full lobby can still take raced guests.
-- Unique (event_id, discord_id) on event_results.

delete from event_results
where id in (
  select id
  from (
    select id, row_number() over (
      partition by event_id, discord_id
      order by submitted_at desc nulls last, id
    ) as n
    from event_results
  ) ranked
  where n > 1
);

create unique index if not exists event_results_event_discord_id_idx
  on event_results (event_id, discord_id);

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
  v_waitlisted boolean;
begin
  if p_results is null
    or jsonb_typeof(p_results) <> 'array'
    or jsonb_array_length(p_results) = 0
  then
    raise exception 'BAD_REQUEST';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_results) as x(discord_id text)
    group by trim(x.discord_id)
    having count(*) > 1
  ) then
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

  -- ponytail: skip capacity for raced guests / waitlist promote; event completes in this RPC.
  perform set_config('forza.skip_participant_capacity', 'on', true);

  for v_row in
    select *
    from jsonb_to_recordset(p_results) as x(
      discord_id text,
      position integer,
      dnf boolean,
      dns boolean,
      group_index smallint,
      gamertag text
    )
  loop
    if v_row.discord_id is null or trim(v_row.discord_id) = '' then
      raise exception 'BAD_REQUEST';
    end if;

    select waitlisted into v_waitlisted
    from event_participants
    where event_id = p_event_id
      and discord_id = trim(v_row.discord_id);

    if not found then
      insert into event_participants (
        event_id,
        discord_id,
        waitlisted,
        group_index,
        is_convoy_leader,
        participation_source,
        gamertag_snapshot
      ) values (
        p_event_id,
        trim(v_row.discord_id),
        false,
        coalesce(v_row.group_index, 1::smallint),
        false,
        'host_assigned',
        nullif(trim(coalesce(v_row.gamertag, '')), '')
      );
    elsif v_waitlisted then
      update event_participants
      set
        waitlisted = false,
        group_index = coalesce(v_row.group_index, 1::smallint),
        gamertag_snapshot = coalesce(
          nullif(trim(gamertag_snapshot), ''),
          nullif(trim(coalesce(v_row.gamertag, '')), '')
        )
      where event_id = p_event_id
        and discord_id = trim(v_row.discord_id);
    end if;
  end loop;

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
    insert into event_results (event_id, discord_id, position, dnf, dns, points, group_index)
    values (
      p_event_id,
      trim(v_row.discord_id),
      v_row.position,
      coalesce(v_row.dnf, false),
      coalesce(v_row.dns, false),
      null,
      coalesce(v_row.group_index, 1::smallint)
    );
  end loop;

  update events
  set status = 'completed'
  where id = p_event_id;
end;
$$;
