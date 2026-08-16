-- Opt-in Browse alerts: Discord DM ~1h after publish if the event is still live.

alter table users
  add column if not exists new_event_notifications_enabled boolean not null default false;

create index if not exists users_new_event_alerts_idx
  on users (discord_id)
  where new_event_notifications_enabled;
