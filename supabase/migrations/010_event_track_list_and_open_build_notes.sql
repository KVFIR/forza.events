-- Track list UX + open build notes

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS additional_car_restrictions text;

UPDATE events
SET additional_car_restrictions = NULLIF(
  regexp_replace((rules_allowed[1]), '^additional:', ''),
  ''
)
WHERE additional_car_restrictions IS NULL
  AND array_length(rules_allowed, 1) > 0
  AND rules_allowed[1] LIKE 'additional:%';
