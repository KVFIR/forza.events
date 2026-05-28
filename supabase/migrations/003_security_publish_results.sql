-- Security / integrity: draft event_cars RLS, publish lock, atomic results submit.
-- Manual RLS check (anon key): select * from event_cars where event_id = '<draft-uuid>';
--   should return 0 rows after this migration.

-- ============================================================
-- 1a. event_cars: hide rows for draft events from anon PostgREST
-- ============================================================
drop policy if exists "public event_cars readable" on event_cars;

create policy "public event_cars readable"
  on event_cars for select to public
  using (
    exists (
      select 1 from events e
      where e.id = event_cars.event_id
        and e.status <> 'draft'::event_status
    )
  );

-- ============================================================
-- 1b. Publish lock (prevents concurrent publish-event races)
-- ============================================================
alter table events
  add column if not exists publish_started_at timestamptz;

comment on column events.publish_started_at is
  'Short-lived lock while publish-event posts to Discord; stale rows reclaimable after 5 minutes.';

-- ============================================================
-- 1c. Atomic results submission (single transaction)
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
      dns boolean
    )
  loop
    insert into event_results (event_id, discord_id, position, dnf, dns, points)
    values (
      p_event_id,
      v_row.discord_id,
      v_row.position,
      coalesce(v_row.dnf, false),
      coalesce(v_row.dns, false),
      null
    );
  end loop;

  update events
  set status = 'completed'
  where id = p_event_id;
end;
$$;

revoke all on function submit_event_results(uuid, text, jsonb) from public;
grant execute on function submit_event_results(uuid, text, jsonb) to service_role;
