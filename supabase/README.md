# Supabase backend

This folder contains the database schema, Edge Functions, and seed data used by the frozen MVP.

## MVP role

Supabase is the backend for:

- event and participant data
- draft save and publish flows
- Discord OAuth token exchange
- results submission
- launch-intent and Discord publish integration
- FH6 cars catalog lookup

See [`docs/PLAN.md`](../docs/PLAN.md) for the frozen MVP contract and [`docs/STATUS.md`](../docs/STATUS.md) for current implementation status.

## Migrations

Apply all migrations through `015`:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

Migration list:

- `001_initial.sql` — initial schema foundation
- `002_engineering_plan.sql` — event metadata, launch intents, storage bucket, early catalog work
- `003_storage_upload_policy.sql` — storage upload policy for event covers
- `004_event_types_and_pi.sql` — event type and PI model updates
- `005_add_car_class_r.sql` — car class enum extension
- `006_fh6_cars_catalog.sql` — FH6 cars catalog refresh
- `007_car_setup_model.sql` — event-level setup model and tune support
- `008_per_car_setup.sql` — per-car PI caps and restrictions
- `009_frozen_mvp_spec.sql` — frozen MVP: car rule mode, DNS, primary track code
- `010_event_track_list_and_open_build_notes.sql` — unified track list + open build notes
- `011_drop_car_class_storage.sql` — drop persisted FH class letters; derive from PI in app
- `012_realtime_and_join_concurrency.sql` — realtime + join concurrency
- `013_events_replica_identity.sql` — replica identity for live lobby patches
- `014_seed_sample_events.sql` — optional dev sample events (`sample-*` slugs)
- `015_discord_guilds_public_read.sql` — RLS read for guild names on event cards

## Edge Functions

Deploy the required functions for the MVP backend:

```bash
supabase functions deploy token-exchange
supabase functions deploy list-guilds
supabase functions deploy list-channels
supabase functions deploy publish-event
supabase functions deploy interactions-endpoint
supabase functions deploy save-event
supabase functions deploy event-participation
supabase functions deploy submit-results
supabase functions deploy user-profile
supabase functions deploy launch-intent
```

## Required secrets

Set once in root `.env`, then push to Supabase:

```bash
cp .env.example .env
# fill DISCORD_* and SUPABASE_* values
npm run sync:secrets
```

Or set individually:

```bash
supabase secrets set DISCORD_CLIENT_ID=...
supabase secrets set DISCORD_CLIENT_SECRET=...
supabase secrets set DISCORD_PUBLIC_KEY=...
supabase secrets set DISCORD_BOT_TOKEN=...
```

Required for localhost OAuth: `DISCORD_REDIRECT_URI=http://localhost:5180/auth/callback`.

Optional: `APP_ORIGIN` (defaults to `https://forza.events` for embed cover URLs).

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected in deployed Edge Functions.

Deploy all functions in one step:

```bash
npm run deploy:functions
# or: bash scripts/deploy-edge-functions.sh
```

If `interactions-endpoint` is used for Discord interaction callbacks, point the Discord Interactions Endpoint to:

`https://<project-ref>.supabase.co/functions/v1/interactions-endpoint`

## Cars catalog

The FH6 cars catalog powers autocomplete and validation for restricted-car events.

Source files:

- `supabase/seed/fh6cars-source.md`
- `supabase/seed/fh6cars.json`
- `006_fh6_cars_catalog.sql`

Refresh workflow after a catalog update:

```bash
node scripts/parse-fh6cars.mjs
supabase db push
# or seed via API
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-cars.mjs
```

## Sample events (development)

Curated browse fixtures with era-matched car lists:

- `supabase/seed/sample-events.json` — source definitions
- `014_seed_sample_events.sql` — SQL seed (idempotent)
- `npm run seed:events` — same data via service role API

Host user: `000000000000000001` / guild `000000000000000001`. Safe to re-run; deletes `slug LIKE 'sample-%'` first.

## Activity env

Client-side Supabase variables live in the root `.env` file.
See `.env.example` for:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
