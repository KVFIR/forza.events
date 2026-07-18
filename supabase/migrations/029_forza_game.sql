-- Multi-game (FH5 / FH6): events + cars catalog dimension.
-- Existing rows default to fh6. Strip year-in-model so UUIDs stay stable for event_cars.

CREATE TYPE forza_game AS ENUM ('fh5', 'fh6');

ALTER TABLE events
  ADD COLUMN game forza_game NOT NULL DEFAULT 'fh6';

ALTER TABLE cars
  ADD COLUMN game forza_game NOT NULL DEFAULT 'fh6';

COMMENT ON COLUMN events.game IS 'Forza Horizon title this event is for (fh5 | fh6).';
COMMENT ON COLUMN cars.game IS 'Catalog game; natural key includes game so FH5/FH6 cars can share make/model/year/pi.';

-- Strip "(YYYY)" parentheticals from model titles (year lives in cars.year only).
UPDATE cars
SET
  model = trim(both FROM regexp_replace(regexp_replace(model, '\s*\(([12][0-9]{3})\)', '', 'g'), '\s{2,}', ' ', 'g')),
  search_text = lower(
    trim(
      both FROM concat_ws(
        ' ',
        make,
        trim(both FROM regexp_replace(regexp_replace(model, '\s*\(([12][0-9]{3})\)', '', 'g'), '\s{2,}', ' ', 'g')),
        coalesce(year::text, ''),
        pi::text
      )
    )
  )
WHERE model ~ '\(([12][0-9]{3})\)';

DROP INDEX IF EXISTS cars_make_model_year_pi_uidx;

CREATE UNIQUE INDEX cars_game_make_model_year_pi_uidx
  ON cars (game, make, model, year, pi);

COMMENT ON INDEX cars_game_make_model_year_pi_uidx IS
  'Catalog sync key per game; do not DELETE cars — use scripts/seed-cars.mjs (upsert + active=false).';
