# Supabase backend

Database schema, Edge Functions, and seeds for the FORZA.EVENTS frozen MVP.

## Role

- Events, participants, results, users
- Discord OAuth (`token-exchange`)
- Publish/join/leave/results flows
- Cover images (Storage + `upload-cover`)
- Launch intents from embed buttons
- FH6 cars catalog (read-only from client; lookup in `save-event`)

See [`docs/PLAN.md`](../docs/PLAN.md), [`docs/STATUS.md`](../docs/STATUS.md), [`AGENTS.md`](../AGENTS.md).

## Migrations

Apply through **`021`**:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

| Migration | Purpose |
|-----------|---------|
| `001_initial.sql` | Core schema |
| `002_engineering_plan.sql` | Launch intents, storage bucket, cars |
| `003_storage_upload_policy.sql` | *(superseded)* anon upload — revoked in `018` |
| `004`–`008` | Event types, PI, catalog, per-car setup |
| `009_frozen_mvp_spec.sql` | Car rule mode, DNS, track model |
| `010`–`011` | Track list, open-build notes |
| `012_realtime_and_join_concurrency.sql` | Realtime + join capacity trigger |
| `013_events_replica_identity.sql` | Replica identity for live updates |
| `014_seed_sample_events.sql` | Dev sample events |
| `015_discord_guilds_public_read.sql` | Guild names on cards |
| `016_event_type_cruise.sql` | `cruise` enum value |
| `017_sample_cruise_type.sql` | Sample data fix |
| `018_security_hardening.sql` | **Drop anon Storage write** on `event-covers` |
| `019_launch_intents_nullable_guild.sql` | DM / no-guild launch intents |
| `020_user_event_join_stats.sql` | `events_joined` trigger |
| `021_api_hardening.sql` | Scoped RLS reads + `check_api_rate_limit` |

## Edge Functions

**14 functions** — deploy all:

```bash
npm run deploy:functions
```

| Function | Auth | Purpose |
|----------|------|---------|
| `browse-events` | Optional Discord token | Feed, event by id, host drafts |
| `host-drafts` | Discord token | Draft list for host |
| `token-exchange` | OAuth code | Activity / localhost OAuth |
| `list-guilds` | Discord token | Publish target servers |
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

Or migration `014`. Host: `000000000000000001`, guild `000000000000000001`.

## Cars catalog

- `supabase/seed/fh6cars.json`, migration `006`
- `save-event` resolves cars by id/lookup only (no arbitrary catalog inserts)
