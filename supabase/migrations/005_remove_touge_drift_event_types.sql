-- Remove touge and drift from event_type enum.
-- Remap: touge -> road, drift -> cruise (no active production events expected).

UPDATE events SET type = 'road'::event_type WHERE type = 'touge';
UPDATE events SET type = 'cruise'::event_type WHERE type = 'drift';

UPDATE events
SET cover_image_url = '/covers/cover-road-2.webp'
WHERE cover_image_url IN ('/covers/cover-touge-1.webp');

UPDATE events
SET cover_image_url = '/covers/cover-cruise-1.webp'
WHERE cover_image_url IN ('/covers/cover-drift-1.webp', '/covers/cover-drift-2.webp');

UPDATE users u
SET preferred_types = COALESCE((
  SELECT array_agg(mapped ORDER BY mapped::text)
  FROM (
    SELECT DISTINCT CASE
      WHEN x::text = 'touge' THEN 'road'::event_type
      WHEN x::text = 'drift' THEN 'cruise'::event_type
      ELSE x
    END AS mapped
    FROM unnest(COALESCE(u.preferred_types, '{}'::event_type[])) AS x
  ) s
), '{}'::event_type[]);

CREATE TYPE event_type_new AS ENUM ('road', 'dirt', 'cruise');

ALTER TABLE events
  ALTER COLUMN type TYPE event_type_new
  USING type::text::event_type_new;

-- preferred_types remapped above; cast via text[] (no subquery in USING).
ALTER TABLE users
  ALTER COLUMN preferred_types TYPE event_type_new[]
  USING COALESCE(preferred_types::text[]::event_type_new[], '{}'::event_type_new[]);

DROP TYPE event_type;
ALTER TYPE event_type_new RENAME TO event_type;
