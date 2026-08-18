-- In-game short name from wiki "abbreviated as" (first alias).
-- Null when the wiki has none; UI synthesizes a HUD-length fallback.
-- Extra aliases live only in search_text (rebuilt by scripts/seed-cars.mjs).

ALTER TABLE cars
  ADD COLUMN abbreviation text;

COMMENT ON COLUMN cars.abbreviation IS
  'Wiki HUD name (first "abbreviated as"); null if the wiki omitted it.';
