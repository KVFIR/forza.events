-- Frozen MVP spec: car rule mode, class cap, DNS results, primary track code

CREATE TYPE car_rule_mode AS ENUM ('anything_goes', 'restricted_list');

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS car_rule_mode car_rule_mode,
  ADD COLUMN IF NOT EXISTS car_class_cap car_class;

UPDATE events e
SET car_rule_mode = CASE
  WHEN EXISTS (SELECT 1 FROM event_cars ec WHERE ec.event_id = e.id) THEN 'restricted_list'::car_rule_mode
  ELSE 'anything_goes'::car_rule_mode
END
WHERE car_rule_mode IS NULL;

UPDATE events
SET car_rule_mode = 'anything_goes'::car_rule_mode
WHERE car_rule_mode IS NULL;

ALTER TABLE events
  ALTER COLUMN car_rule_mode SET NOT NULL,
  ALTER COLUMN car_rule_mode SET DEFAULT 'anything_goes';

-- Promote first legacy track code to primary when missing
UPDATE events
SET event_share_code = track_codes[1]
WHERE (event_share_code IS NULL OR btrim(event_share_code) = '')
  AND coalesce(array_length(track_codes, 1), 0) > 0;

ALTER TABLE event_results
  ADD COLUMN IF NOT EXISTS dns boolean NOT NULL DEFAULT false;
