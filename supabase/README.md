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

Apply all migrations through the frozen MVP migration:

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
- `005_fh6_cars_catalog.sql` — FH6 cars catalog refresh
- `006_car_setup_model.sql` — event-level setup model and tune support
- `007_per_car_setup.sql` — per-car PI caps and restrictions
- `008_frozen_mvp_spec.sql` — frozen MVP alignment: car rule mode, class cap, DNS, primary track code
- `009_event_track_list_and_open_build_notes.sql` — unified track list + open build additional restrictions
- `010_drop_car_class_storage.sql` — drop persisted FH class letters; derive from PI in the app

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

Optional: `DISCORD_REDIRECT_URI` (only if token exchange requires it), `APP_ORIGIN` (defaults to `https://forza.events`).

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
- `005_fh6_cars_catalog.sql`

Refresh workflow after a catalog update:

```bash
node scripts/parse-fh6cars.mjs
supabase db push
# or seed via API
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-cars.mjs
```

## Activity env

Client-side Supabase variables live in the root `.env` file.
See `.env.example` for:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
