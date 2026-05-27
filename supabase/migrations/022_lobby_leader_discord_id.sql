-- Convoy leader Discord account (for results + roster when leader is not the host).

alter table events
  add column if not exists lobby_leader_discord_id text references users (discord_id) on delete set null;

create index if not exists events_lobby_leader_discord_id_idx
  on events (lobby_leader_discord_id)
  where lobby_leader_discord_id is not null;

-- Host-as-leader rows: leader id is the host.
update events
set lobby_leader_discord_id = host_discord_id
where lobby_leader_discord_id is null
  and coalesce(lobby_leader_is_host, true) = true;
