-- Per-car setup + event share code

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS event_share_code text;

ALTER TABLE event_cars
  ADD COLUMN IF NOT EXISTS max_pi int NOT NULL DEFAULT 999,
  ADD COLUMN IF NOT EXISTS car_restrictions text[] NOT NULL DEFAULT '{}';

ALTER TABLE event_cars
  ADD CONSTRAINT event_cars_max_pi_check CHECK (max_pi >= 100 AND max_pi <= 999);
