-- Stable natural key for FH6 catalog sync (upsert preserves car id → event_cars stay valid).

CREATE UNIQUE INDEX IF NOT EXISTS cars_make_model_year_pi_uidx
  ON cars (make, model, year, pi);

COMMENT ON INDEX cars_make_model_year_pi_uidx IS
  'Catalog sync key; do not DELETE cars — use scripts/seed-cars.mjs (upsert + active=false).';
