# Supabase backend

Database schema, Edge Functions, and seeds for the FORZA.EVENTS frozen MVP.

Last updated: 2026-05-29

## Role

- Events, participants, results, users
- Discord OAuth (`token-exchange`)
- Publish/join/leave/results flows
- Cover images (Storage + `upload-cover`)
- Launch intents from embed buttons
- FH6 cars catalog (read-only from client; lookup in `save-event`)

See [`docs/PLAN.md`](../docs/PLAN.md), [`docs/STATUS.md`](../docs/STATUS.md), [`AGENTS.md`](../AGENTS.md).

## Migrations

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

| Migration | Purpose |
|-----------|---------|
| `001_baseline.sql` | Full schema: enums, tables, indexes, functions, triggers, RLS, realtime, storage |
| `002_event_tracks_jsonb.sql` | `events.tracks` jsonb + legacy backfill |
| `003_security_publish_results.sql` | `event_cars` RLS (no draft leak), `publish_started_at` lock, `submit_event_results` RPC |
| `004_rpc_submit_hardening.sql` | `submit_event_results`: trim `discord_id`, explicit `RAISE` messages |

Seeds are **not** included in the migration. Run separately after `db push`:

```bash
npm run seed:events   # sample events (dev only)
# Cars catalog is seeded via scripts/seed-cars.mjs or import from supabase/seed/fh6cars.json
```

## Edge Functions

**15 functions** — canonical list in [`scripts/deploy-edge-functions.sh`](../scripts/deploy-edge-functions.sh). Deploy all:

```bash
npm run deploy:functions
```

| Function | Auth | Purpose |
|----------|------|---------|
| `browse-events` | Optional Discord token | Feed, event by id, host drafts |
| `host-drafts` | Discord token | Draft list for host |
| `token-exchange` | OAuth code | Activity / localhost OAuth |
| `list-guilds` | Discord token | Publish target servers |
| `list-guild-members` | Discord token | Convoy leader search (needs Server Members intent) |
| `list-channels` | Discord token | Postable channels |
| `validate-channel` | Discord token | Channel validation |
| `publish-event` | Discord token | Post Discord embed |
| `save-event` | Discord token | CRUD draft / edit / cancel |
| `event-participation` | Discord token | Join / leave |
| `submit-results` | Discord token | Results + complete |
| `user-profile` | Discord token | Profile updates |
| `launch-intent` | Discord token | Embed deep-link fallback |
| `upload-cover` | Discord token | Cover image upload |
| `interactions-endpoint` | Ed25519 signature | `LAUNCH_ACTIVITY` button |

All Activity-facing functions use **`verify_jwt = false`** in `config.toml` and **`--no-verify-jwt`** on deploy. Gateway auth is **`apikey`** + **`Authorization: Bearer <anon>`**; user auth is **`x-discord-access-token`**.

Shared modules: `_shared/cors.ts`, `guildAccess.ts`, `publishTarget.ts`, `oauthRedirect.ts`, `rateLimit.ts`, `embedSync.ts`, …

## Secrets

Root `.env` → Supabase:

```bash
npm run sync:secrets
```

Required: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_PUBLIC_KEY`, `DISCORD_BOT_TOKEN`.

Recommended on hosted project: `APP_ORIGIN` (Railway URL), `DISCORD_REDIRECT_URI` for localhost dev.

Optional Edge secrets: `DISCORD_REDIRECT_URI_ALLOWLIST`, `ALLOWED_CORS_ORIGINS` (comma-separated origins for CORS).

## Discord Interactions URL

```
https://<project-ref>.supabase.co/functions/v1/interactions-endpoint
```

Uses `DISCORD_PUBLIC_KEY` for request verification (not user OAuth).

## Storage: event covers

- Bucket: `event-covers` (public read)
- **Writes:** only via `upload-cover` (service role)
- Client: `uploadCoverImage(token, guildId, eventId, file)` in `src/lib/api.ts`

## Sample events

```bash
npm run seed:events   # needs SUPABASE_SERVICE_ROLE_KEY
```

Host: `000000000000000001`, guild `000000000000000001`.

## Cars catalog

- `supabase/seed/fh6cars.json` (source data)
- `save-event` resolves cars by id/lookup only (no arbitrary catalog inserts)
