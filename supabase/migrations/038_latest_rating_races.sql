-- Last ranked event per driver for the ladder (DISTINCT ON; service_role only).

create or replace function latest_rating_races(p_discord_ids text[])
returns table (
  discord_id text,
  event_id uuid,
  event_title text,
  starts_at timestamptz,
  delta integer
)
language sql
stable
set search_path = public
as $$
  select distinct on (rl.discord_id)
    rl.discord_id,
    rl.event_id,
    e.title,
    e.starts_at,
    rl.delta
  from rating_ledger rl
  join events e on e.id = rl.event_id
  where rl.discord_id = any (p_discord_ids)
  order by rl.discord_id, rl.created_at desc;
$$;

revoke all on function latest_rating_races(text[]) from public;
grant execute on function latest_rating_races(text[]) to service_role;
