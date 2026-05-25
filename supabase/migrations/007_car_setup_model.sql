-- Car setup: max PI cap + either general part restrictions or per-car tune codes

CREATE TYPE car_setup_mode AS ENUM ('general', 'prescribed_tunes');

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS max_pi int,
  ADD COLUMN IF NOT EXISTS car_setup_mode car_setup_mode DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS tuning_restrictions text[] DEFAULT '{}';

UPDATE events SET max_pi = car_pi_max WHERE max_pi IS NULL;
UPDATE events SET max_pi = 999 WHERE max_pi IS NULL;

ALTER TABLE events
  ALTER COLUMN max_pi SET NOT NULL,
  ALTER COLUMN max_pi SET DEFAULT 999;

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_pi_range_check;
ALTER TABLE events DROP COLUMN IF EXISTS car_pi_min;
ALTER TABLE events DROP COLUMN IF EXISTS car_pi_max;
ALTER TABLE events DROP COLUMN IF EXISTS tuning_restricted;
ALTER TABLE events DROP COLUMN IF EXISTS tune_share_code;

ALTER TABLE events
  ADD CONSTRAINT events_max_pi_check CHECK (max_pi >= 100 AND max_pi <= 999);

ALTER TABLE event_cars
  ADD COLUMN IF NOT EXISTS tune_share_code text;
