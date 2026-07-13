-- Draft events may be saved before a publish target (Discord server) is chosen.
alter table events alter column guild_id drop not null;
