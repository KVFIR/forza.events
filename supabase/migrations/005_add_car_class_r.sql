-- car_class 'R' (Rally/Track) must be committed before inserts reference it (PG enum rule).
ALTER TYPE car_class ADD VALUE IF NOT EXISTS 'R';
