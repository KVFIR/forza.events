-- Cached permanent invite + display name for the gathering voice channel
-- (Join voice + 2h DMs).

alter table events
  add column if not exists voice_invite_url text;

alter table events
  add column if not exists voice_channel_name text;
