# Supabase backend

## Migrations

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

Migrations:

- `001_initial.sql` — core schema (users, events, participants)
- `002_engineering_plan.sql` — extended event metadata, launch intents, initial cars catalog, storage bucket
- `003_storage_upload_policy.sql` — storage upload policy for event covers
- `004_event_types_and_pi.sql` — event type migration and PI model updates
- `005_fh6_cars_catalog.sql` — full FH6 cars catalog refresh
- `006_car_setup_model.sql` — event-level setup model and tune support
- `007_per_car_setup.sql` — per-car PI caps and restrictions

## Edge Functions

Deploy all functions:

```bash
supabase functions deploy token-exchange
supabase functions deploy list-channels
supabase functions deploy publish-event
supabase functions deploy interactions-endpoint
supabase functions deploy save-event
supabase functions deploy event-participation
supabase functions deploy submit-results
supabase functions deploy user-profile
supabase functions deploy launch-intent
```

Set secrets:

```bash
supabase secrets set DISCORD_CLIENT_ID=...
supabase secrets set DISCORD_CLIENT_SECRET=...
supabase secrets set DISCORD_PUBLIC_KEY=...
supabase secrets set DISCORD_BOT_TOKEN=...
supabase secrets set APP_ORIGIN=https://forza.events
```

Point the Discord **Interactions Endpoint** to:

`https://<project-ref>.supabase.co/functions/v1/interactions-endpoint`

## Cars catalog (FH6)

Official list from [forza.net/fh6cars](https://forza.net/fh6cars) (618 cars, PI + class per row).

- Source snapshot: `supabase/seed/fh6cars-source.md`
- Parsed JSON: `supabase/seed/fh6cars.json`
- Migration: `005_fh6_cars_catalog.sql` (full replace)

Refresh after Forza updates the list:

```bash
# 1. Update fh6cars-source.md from forza.net
# 2. Regenerate JSON + SQL
node scripts/parse-fh6cars.mjs
# 3. Apply
supabase db push
# Or seed via API:
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-cars.mjs
```

### FH6 PI → class bands

| Class | PI range |
|-------|----------|
| D | 100–400 |
| C | 401–500 |
| B | 501–600 |
| A | 601–700 |
| S1 | 701–800 |
| S2 | 801–900 |
| R | 901–999 |

## Activity env

See root `.env.example` for `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
