-- Event route list: name + optional share code + optional format (laps/time/distance).
alter table events
  add column if not exists tracks jsonb not null default '[]'::jsonb;

comment on column events.tracks is
  'Ordered route legs: [{ "name": text, "share_code"?: text, "format"?: text }]';

-- Backfill from legacy event_share_code + track_codes.
update events e
set tracks = coalesce(sub.tracks, '[]'::jsonb)
from (
  select
    ev.id,
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'name', '',
            'share_code', c,
            'format', null
          )
          order by ord
        ),
        '[]'::jsonb
      )
      from (
        select trim(u.c) as c, row_number() over () as ord
        from unnest(
          array_cat(
            case
              when trim(coalesce(ev.event_share_code, '')) <> '' then
                array[trim(ev.event_share_code)]
              else array[]::text[]
            end,
            coalesce(ev.track_codes, array[]::text[])
          )
        ) as u(c)
        where trim(u.c) <> ''
      ) numbered
    ) as tracks
  from events ev
) sub
where e.id = sub.id
  and jsonb_array_length(coalesce(e.tracks, '[]'::jsonb)) = 0
  and sub.tracks is not null
  and jsonb_array_length(sub.tracks) > 0;
