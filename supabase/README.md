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
supabase migration list   # local vs remote must match before push
supabase db push
```

**Version names:** use the same numeric prefix as existing files (`001` … `007`), not CLI timestamps. If remote history drifts (e.g. `20260601234442` applied but repo has `006`), repair without re-running SQL when the schema is already correct:

```bash
npx supabase migration repair --linked --status reverted <orphan-version> --yes
npx supabase migration repair --linked --status applied 006 --yes
```

| Migration | Purpose |
|-----------|---------|
| `001_baseline.sql` | Full schema: enums, tables, indexes, functions, triggers, RLS, realtime, storage |
| `002_event_tracks_jsonb.sql` | `events.tracks` jsonb + legacy backfill |
| `003_security_publish_results.sql` | `event_cars` RLS (no draft leak), `publish_started_at` lock, `submit_event_results` RPC |
| `004_rpc_submit_hardening.sql` | `submit_event_results`: trim `discord_id`, explicit `RAISE` messages |
| `005_remove_touge_drift_event_types.sql` | Drop `touge`/`drift` from `event_type` enum (remap to `road`/`cruise`) |
| `006_cars_catalog_sync.sql` | Unique `(make, model, year, pi)` for catalog upsert (preserves `event_cars`) |
| `007_event_groups_waitlist.sql` | `events.group_count`, `event_participants.group_index`, `event_results.group_index`; per-group leader/position indexes; per-group capacity trigger; count triggers fire on UPDATE (waitlist promotion); `submit_event_results` accepts `group_index` |
| `008_waitlist_atomic_rpc.sql` | Atomic RPCs: `promote_waitlist_to_group`, `add_event_group`, `leave_event_participant` (leave + promotion in one transaction) |
| `009_add_group_lobby_full_guard.sql` | `add_event_group`: raise `LOBBY_NOT_FULL` when active groups still have open seats |
| `010_participant_group_index_guard.sql` | Trigger: active `group_index` must be within `1..events.group_count` |
| `011_leave_promote_smallint_cast.sql` | Fix `leave_event_participant` → `promote_waitlist_to_group` smallint cast (leave + waitlist promotion) |
| `012_smallint_rpc_hardening.sql` | Integer overload for `promote_waitlist_to_group`; `1::smallint` in `add_event_group` / group_index guard; self-check |
| `013_submit_results_group_index_cast.sql` | `submit_event_results`: `coalesce(group_index, 1::smallint)` |
| `014_nullable_draft_guild.sql` | Draft events may omit `guild_id` until publish target is chosen |
| `015_add_group_leader_from_roster.sql` | `add_event_group`: leader may be picked from active roster (not only waitlist) |
| `016_add_group_preserve_self_join.sql` | `add_event_group`: preserve `self_join` participation source on promotion |
| `017_discord_notifications.sql` | DM notification outbox, user prefs (`dm_notifications_enabled`, `notification_locale`); `leave_event_participant` returns `promoted_discord_id` |
| `018_add_group_without_waitlist.sql` | `add_event_group`: allow add group when every active group is full, without requiring waitlist |
| `019_notification_outbox_claim.sql` | Outbox `processing` status + `claim_notification_outbox_batch` (`FOR UPDATE SKIP LOCKED`) |

Seeds are **not** included in the migration. Run separately after `db push`:

```bash
npm run seed:events   # sample events (dev only)
# Cars catalog is seeded via scripts/seed-cars.mjs or import from supabase/seed/fh6cars.json
```

## Edge Functions

**16 functions** — canonical list in [`scripts/deploy-edge-functions.sh`](../scripts/deploy-edge-functions.sh). Deploy all:

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
| `event-participation` | Discord token | Join (first open group / waitlist) / leave (auto-promote queue) |
| `add-group` | Discord token | Host adds a lobby group (leader + auto-fill from waitlist) |
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

- `supabase/seed/fh6cars.json` — app + offline search (`src/lib/carCatalog.ts`); generated from Fandom scrape
- `data/fh6_fandom_cars.json` — full wiki scrape; `data/Forza_Horizon_6_Cars_Fandom.xlsx` — spreadsheet export
- `save-event` resolves cars by id/lookup only (no arbitrary catalog inserts)

```bash
npm run data:fh6:scrape    # scrape → fh6_fandom_cars.json + fh6cars.json
npm run data:fh6:xlsx      # optional spreadsheet from fh6_fandom_cars.json
supabase db push           # apply 007+ if needed
npm run seed:cars          # upsert catalog (linked CLI); does not delete event_cars
```

`seed:cars` upserts on `(make, model, year, pi)`, keeps existing `cars.id`, and sets `active=false` for removed entries. Use `node scripts/seed-cars.mjs --service-role` when `SUPABASE_SERVICE_ROLE_KEY` is set.
