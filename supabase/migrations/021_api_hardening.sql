-- Scoped anon reads + Postgres-backed API rate limits (Edge Functions via service role).

drop policy if exists "public users readable" on users;
drop policy if exists "public participants readable" on event_participants;
drop policy if exists "public results readable" on event_results;

create policy "users visible in public events"
  on users for select
  using (
    exists (
      select 1
      from events e
      where e.host_discord_id = users.discord_id
        and e.status <> 'draft'
    )
    or exists (
      select 1
      from event_participants ep
      inner join events e on e.id = ep.event_id
      where ep.discord_id = users.discord_id
        and e.status <> 'draft'
    )
  );

create policy "participants of public events readable"
  on event_participants for select
  using (
    exists (
      select 1
      from events e
      where e.id = event_participants.event_id
        and e.status <> 'draft'
    )
  );

create policy "results of public events readable"
  on event_results for select
  using (
    exists (
      select 1
      from events e
      where e.id = event_results.event_id
        and e.status <> 'draft'
    )
  );

create table api_rate_limits (
  key             text primary key,
  window_start    timestamptz not null,
  request_count   int not null default 0
);

alter table api_rate_limits enable row level security;

create or replace function public.check_api_rate_limit(
  p_key text,
  p_max int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_count int;
  v_start timestamptz;
begin
  if p_max < 1 or p_window_seconds < 1 then
    return true;
  end if;

  select request_count, window_start
  into v_count, v_start
  from api_rate_limits
  where key = p_key
  for update;

  if not found then
    insert into api_rate_limits (key, window_start, request_count)
    values (p_key, v_now, 1);
    return true;
  end if;

  if v_now >= v_start + make_interval(secs => p_window_seconds) then
    update api_rate_limits
    set window_start = v_now, request_count = 1
    where key = p_key;
    return true;
  end if;

  if v_count >= p_max then
    return false;
  end if;

  update api_rate_limits
  set request_count = request_count + 1
  where key = p_key;
  return true;
end;
$$;

revoke all on function public.check_api_rate_limit(text, int, int) from public;
grant execute on function public.check_api_rate_limit(text, int, int) to service_role;

-- Prune stale buckets (optional cron; safe to run manually)
create or replace function public.prune_api_rate_limits(p_older_than_seconds int default 3600)
returns void
language sql
security definer
set search_path = public
as $$
  delete from api_rate_limits
  where window_start < now() - make_interval(secs => p_older_than_seconds);
$$;

revoke all on function public.prune_api_rate_limits(int) from public;
grant execute on function public.prune_api_rate_limits(int) to service_role;
