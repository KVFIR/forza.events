-- Discord Message Components V2 for newly published event cards.
-- Existing rows stay classic (`false`); publish-event sets true on finalize.

alter table events
  add column if not exists discord_components_v2 boolean not null default false;
