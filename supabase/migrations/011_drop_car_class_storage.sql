-- Stop persisting FH class letters; derive from PI in the app.

ALTER TABLE events
  DROP COLUMN IF EXISTS car_class_cap;

DROP INDEX IF EXISTS cars_class_idx;

ALTER TABLE cars
  DROP COLUMN IF EXISTS class;
