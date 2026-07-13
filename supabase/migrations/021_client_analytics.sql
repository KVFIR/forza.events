-- Client analytics: surface (activity vs browser), funnel steps, API errors.

create type client_surface as enum ('activity', 'browser_web', 'browser_blocked', 'unknown');

create table client_events (
  id            uuid          primary key default gen_random_uuid(),
  created_at    timestamptz   not null default now(),
  surface       client_surface not null default 'unknown',
  event_name    text          not null,
  outcome       text,
  api_code      text,
  http_status   smallint,
  function_name text,
  discord_id    text,
  event_id      uuid,
  meta          jsonb         not null default '{}',
  constraint client_events_event_name_check check (event_name ~ '^[a-z][a-z0-9_]{0,63}$'),
  constraint client_events_outcome_check check (
    outcome is null or outcome in ('success', 'error')
  )
);

create index client_events_created_at_idx on client_events (created_at desc);
create index client_events_event_name_created_idx on client_events (event_name, created_at desc);
create index client_events_surface_created_idx on client_events (surface, created_at desc);
create index client_events_api_code_created_idx on client_events (api_code, created_at desc)
  where api_code is not null;

alter table client_events enable row level security;

-- ponytail: no retention cron yet — call prune_client_events manually or add scheduled job later.
create or replace function prune_client_events(p_older_than_days integer default 90)
returns integer
language sql
security definer
set search_path = public
as $$
  with deleted as (
    delete from client_events
    where created_at < now() - make_interval(days => greatest(p_older_than_days, 1))
    returning 1
  )
  select count(*)::integer from deleted;
$$;

revoke all on function prune_client_events(integer) from public;
grant execute on function prune_client_events(integer) to service_role;
