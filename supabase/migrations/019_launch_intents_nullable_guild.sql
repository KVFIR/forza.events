-- Embed button clicks outside a server (e.g. forwarded DMs) have no guild_id.

alter table launch_intents
  alter column guild_id drop not null;

create index if not exists li_discord_recent
  on launch_intents (discord_id, created_at desc);
