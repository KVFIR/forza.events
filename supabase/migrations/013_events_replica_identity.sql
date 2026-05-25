-- Realtime UPDATE payloads must include old row values (e.g. draft → open on publish).
alter table public.events replica identity full;
