-- Engineering plan extensions: cars, event_cars, launch_intents, extended events

create extension if not exists pg_trgm;

-- ─── events: new columns, drop legacy text fields ───

alter table events
  add column if not exists cover_image_url text,
  add column if not exists description text,
  add column if not exists track_codes text[] default '{}',
  add column if not exists rules_allowed text[] default '{}',
  add column if not exists rules_forbidden text[] default '{}',
  add column if not exists lobby_leader_gamertag text,
  add column if not exists lobby_leader_is_host boolean default true,
  add column if not exists timezone_hint text;

update events
set lobby_leader_gamertag = coalesce(lobby_leader_gamertag, 'TBD')
where lobby_leader_gamertag is null;

alter table events
  alter column lobby_leader_gamertag set not null,
  alter column lobby_leader_gamertag set default 'TBD';

alter table events drop column if exists rules_text;
alter table events drop column if exists notes;

-- Migrate any legacy description from dropped columns (no-op if already migrated)
-- channel_id already nullable in 001

-- ─── event_participants: gamertag snapshot ───

alter table event_participants
  add column if not exists gamertag_snapshot text;

-- ─── cars catalog ───

create table cars (
  id          uuid primary key default gen_random_uuid(),
  make        text not null,
  model       text not null,
  year        int,
  class       car_class not null,
  search_text text generated always as (
    make || ' ' || model || ' ' || coalesce(year::text, '')
  ) stored,
  active      boolean default true,
  created_at  timestamptz default now()
);

create index cars_search_idx on cars using gin (search_text gin_trgm_ops);
create index cars_class_idx on cars(class) where active = true;

create table event_cars (
  event_id uuid not null references events(id) on delete cascade,
  car_id   uuid not null references cars(id) on delete cascade,
  primary key (event_id, car_id)
);

-- ─── launch intents (deep link from embed button) ───

create table launch_intents (
  id         uuid primary key default gen_random_uuid(),
  discord_id text not null,
  guild_id   text not null,
  event_id   uuid not null references events(id) on delete cascade,
  created_at timestamptz default now()
);

create index li_lookup on launch_intents(discord_id, guild_id);
create index li_created_at on launch_intents(created_at);

-- ─── RLS for new tables ───

alter table cars enable row level security;
alter table event_cars enable row level security;
alter table launch_intents enable row level security;

create policy "public cars readable"
  on cars for select using (active = true);

create policy "public event_cars readable"
  on event_cars for select using (true);

-- launch_intents: no public access (Edge Functions use service role)

-- ─── Storage bucket for cover images ───

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-covers',
  'event-covers',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "public cover read"
  on storage.objects for select
  using (bucket_id = 'event-covers');

-- Writes validated via signed URLs / service role from Edge Functions

-- ─── Seed: curated FH6 cars (expand via scripts/seed-cars) ───

insert into cars (make, model, year, class) values
  ('Nissan', 'Skyline GT-R V-Spec', 1999, 'A'),
  ('Nissan', 'GT-R NISMO', 2020, 'S1'),
  ('Toyota', 'Supra RZ', 1998, 'A'),
  ('Toyota', 'GR Supra', 2020, 'A'),
  ('Honda', 'NSX-R', 2005, 'S1'),
  ('Honda', 'Civic Type R', 2018, 'B'),
  ('Mazda', 'RX-7 Spirit R', 2002, 'A'),
  ('Mazda', 'MX-5 Miata', 2016, 'C'),
  ('BMW', 'M3 Competition', 2021, 'A'),
  ('BMW', 'M4 GTS', 2016, 'S1'),
  ('Mercedes-Benz', 'AMG GT Black Series', 2020, 'S2'),
  ('Mercedes-Benz', '190E Evolution II', 1990, 'B'),
  ('Audi', 'RS 6 Avant', 2020, 'A'),
  ('Audi', 'Sport quattro S1', 1984, 'S1'),
  ('Porsche', '911 GT3 RS', 2023, 'S1'),
  ('Porsche', 'Carrera GT', 2004, 'S2'),
  ('Ferrari', '488 Pista', 2019, 'S1'),
  ('Ferrari', 'F40', 1987, 'S2'),
  ('Lamborghini', 'Huracán STO', 2021, 'S1'),
  ('Lamborghini', 'Countach LP5000 QV', 1985, 'S1'),
  ('Ford', 'GT', 2017, 'S1'),
  ('Ford', 'Mustang Shelby GT500', 2020, 'A'),
  ('Chevrolet', 'Corvette Z06', 2023, 'S1'),
  ('Chevrolet', 'Camaro ZL1', 2018, 'A'),
  ('Dodge', 'Viper ACR', 2016, 'S1'),
  ('Dodge', 'Challenger SRT Demon', 2018, 'S1'),
  ('McLaren', '720S', 2018, 'S1'),
  ('McLaren', 'F1', 1993, 'X'),
  ('Bugatti', 'Chiron', 2018, 'X'),
  ('Koenigsegg', 'Jesko', 2020, 'X'),
  ('Pagani', 'Huayra BC', 2016, 'X'),
  ('Subaru', 'WRX STI', 2015, 'B'),
  ('Mitsubishi', 'Lancer Evolution X', 2008, 'B'),
  ('Volkswagen', 'Golf R', 2022, 'B'),
  ('Alfa Romeo', 'Giulia Quadrifoglio', 2019, 'A'),
  ('Aston Martin', 'Vantage', 2019, 'S1'),
  ('Bentley', 'Continental GT Speed', 2021, 'S1'),
  ('Jaguar', 'F-Type R', 2015, 'A'),
  ('Lexus', 'LFA', 2012, 'S1'),
  ('Acura', 'NSX', 2017, 'S1'),
  ('Infiniti', 'Q60 Project Black S', 2020, 'A'),
  ('Renault', 'Megane R.S.', 2018, 'B'),
  ('Peugeot', '205 Turbo 16', 1984, 'B'),
  ('Citroën', 'DS3 Racing', 2011, 'C'),
  ('Lotus', 'Elise', 2011, 'C'),
  ('Caterham', 'Super Seven 620R', 2016, 'B'),
  ('Shelby', 'Cobra 427', 1965, 'A'),
  ('Pontiac', 'Firebird Trans Am', 1969, 'B'),
  ('AMC', 'Javelin AMX', 1971, 'B');
