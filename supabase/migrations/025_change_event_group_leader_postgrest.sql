-- PostgREST cannot pick between integer vs smallint overloads when Edge passes JSON number
-- for p_group_index (PGRST203 → unmapped 500 INTERNAL). PL/pgSQL callers cast explicitly.

drop function if exists change_event_group_leader(uuid, integer, text, text, text);
