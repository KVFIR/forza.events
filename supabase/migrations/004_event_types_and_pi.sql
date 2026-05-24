-- Event types: Road, Dirt, Drift, Touge
-- Car restrictions: PI range + optional tune share code

-- Migrate event_type enum (also used on users.preferred_types)
ALTER TABLE users ALTER COLUMN preferred_types TYPE text[] USING ARRAY[]::text[];
ALTER TABLE events ALTER COLUMN type DROP DEFAULT;
ALTER TABLE events ALTER COLUMN type TYPE text USING type::text;

DROP TYPE event_type;
CREATE TYPE event_type AS ENUM ('road', 'dirt', 'drift', 'touge');

ALTER TABLE users
  ALTER COLUMN preferred_types TYPE event_type[] USING ARRAY[]::event_type[];

ALTER TABLE events
  ALTER COLUMN type TYPE event_type USING (
    CASE
      WHEN type = 'drift' THEN 'drift'::event_type
      WHEN type IN ('cruise', 'meet', 'convoy', 'challenge') THEN 'road'::event_type
      WHEN type IN ('eliminator', 'tournament', 'championship') THEN 'dirt'::event_type
      ELSE 'road'::event_type
    END
  );

-- PI + tuning on events
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS car_pi_min int NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS car_pi_max int NOT NULL DEFAULT 999,
  ADD COLUMN IF NOT EXISTS tuning_restricted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tune_share_code text;

ALTER TABLE events DROP COLUMN IF EXISTS car_class;

ALTER TABLE events
  ADD CONSTRAINT events_pi_range_check
  CHECK (car_pi_min >= 100 AND car_pi_max <= 999 AND car_pi_min <= car_pi_max);

-- Region/platform no longer required at create time
ALTER TABLE events ALTER COLUMN region DROP NOT NULL;
ALTER TABLE events ALTER COLUMN region SET DEFAULT 'global';
ALTER TABLE events ALTER COLUMN platform SET DEFAULT 'crossplay';

-- PI on cars catalog
ALTER TABLE cars ADD COLUMN IF NOT EXISTS pi int;

UPDATE cars SET pi = CASE class::text
  WHEN 'D' THEN 450
  WHEN 'C' THEN 550
  WHEN 'B' THEN 650
  WHEN 'A' THEN 750
  WHEN 'S1' THEN 850
  WHEN 'S2' THEN 950
  WHEN 'X' THEN 999
  ELSE 700
END
WHERE pi IS NULL;

ALTER TABLE cars ALTER COLUMN pi SET NOT NULL;
ALTER TABLE cars ADD CONSTRAINT cars_pi_check CHECK (pi >= 100 AND pi <= 999);

CREATE INDEX IF NOT EXISTS cars_pi_idx ON cars(pi) WHERE active = true;
