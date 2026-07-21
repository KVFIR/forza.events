-- Pilot ranked allowlist: Forza Racing Series Discord server.
insert into rating_enabled_guilds (guild_id, note)
values ('925000150638809178', 'Forza Racing Series')
on conflict (guild_id) do update set note = excluded.note;
