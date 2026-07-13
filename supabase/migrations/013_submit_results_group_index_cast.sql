-- submit_event_results: coalesce(group_index, 1) → integer; use smallint default consistently.

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
      coalesce(v_row.group_index, 1::smallint)
    );
  end loop;

  update events
  set status = 'completed'
  where id = p_event_id;
end;
$$;
