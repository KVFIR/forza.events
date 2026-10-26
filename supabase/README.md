# Supabase backend

Schema, Edge Functions, and seeds for FORZA.EVENTS.

Last updated: 2026-09-15

Events, participants, results, users, Discord OAuth (`token-exchange`), publish/join/leave/results, covers (`upload-cover`), launch intents, FH5/FH6 cars catalog, DM outbox, ranked ELO, client analytics.

See [`docs/PLAN.md`](../docs/PLAN.md), [`docs/STATUS.md`](../docs/STATUS.md), [`AGENTS.md`](../AGENTS.md).

## Migrations

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase migration list
supabase db push
```

Use numbered prefixes (`001` … `043`), not CLI timestamps. If remote history drifted:

```bash
npx supabase migration repair --linked --status reverted <orphan-version> --yes
npx supabase migration repair --linked --status applied <nnn> --yes
```

Never edit a migration already applied on remote — add a new numbered file.

| Migration | Purpose |
|-----------|---------|
| `001_baseline.sql` | Schema, RLS, realtime, storage |
| `002_event_tracks_jsonb.sql` | `events.tracks` jsonb |
| `003_security_publish_results.sql` | `event_cars` RLS, publish lock, `submit_event_results` |
| `004_rpc_submit_hardening.sql` | Harden `submit_event_results` |
| `005_remove_touge_drift_event_types.sql` | Drop `touge`/`drift` (remap road/cruise) |
| `006_cars_catalog_sync.sql` | Unique `(make, model, year, pi)` for catalog upsert |
| `007_event_groups_waitlist.sql` | Convoys + waitlist columns / triggers |
| `008_waitlist_atomic_rpc.sql` | Join/leave/promote/add-group RPCs |
| `009_add_group_lobby_full_guard.sql` | `LOBBY_NOT_FULL` |
| `010_participant_group_index_guard.sql` | Active `group_index` in `1..group_count` |
| `011`–`013` | smallint casts on leave/promote/submit |
| `014_nullable_draft_guild.sql` | Drafts may omit `guild_id` |
| `015`–`016` | Add-group leader from roster; keep `self_join` |
| `017_discord_notifications.sql` | DM outbox + prefs; leave RPC returns jsonb |
| `018_add_group_without_waitlist.sql` | Add group without requiring waitlist |
| `019_notification_outbox_claim.sql` | `FOR UPDATE SKIP LOCKED` claim |
| `020_change_event_group_leader.sql` | Change convoy leader RPC |
| `021`–`024`, `026`, `041` | `client_events` + analytics dashboard RPCs |
| `025_change_event_group_leader_postgrest.sql` | Drop integer overload (`PGRST203`) |
| `027_nullable_event_max_pi.sql` | Open build may omit PI cap |
| `028` + `030` | `apply_event_group_moves` (after start; final size check) |
| `029_forza_game.sql` | `events.game` / `cars.game` (`fh5` \| `fh6`) |
| `031`–`034` | Ranked ELO, FRS allowlist, atomic/relative apply |
| `035_submit_results_guest_roster.sql` | Results guests / waitlist-on-submit |
| `036_new_event_notifications.sql` | Browse new-event DM pref |
| `037_event_voice_invite.sql` | `voice_invite_url` + channel name |
| `038_latest_rating_races.sql` | Ladder last-race / Δ |
| `039_car_abbreviation.sql` | `cars.abbreviation` |
| `040_discord_components_v2.sql` | V2 publish cards |
| `042_event_cars_sort_order.sql` | Restricted-list add order |
| `043_event_cars_row_id.sql` | Duplicate catalog cars (alt builds) |

Seeds are **not** in migrations:

```bash
npm run seed:cars      # both catalogs
npm run seed:events    # sample events (dev only)
```

## Edge Functions

**23 functions** — [`scripts/deploy-edge-functions.sh`](../scripts/deploy-edge-functions.sh).

```bash
npm run deploy:functions
```

| Function | Auth | Purpose |
|----------|------|---------|
| `browse-events` | Optional Discord | Feed, `{event_id}`, `{event_ids}`, host drafts |
| `host-drafts` | Discord | Host draft list |
| `token-exchange` | OAuth code / refresh | Activity + browser OAuth |
| `list-guilds` | Discord | Publish targets + DM reachability |
| `list-guild-members` | Discord | Convoy leader / results guest search (Server Members intent) |
| `list-channels` | Discord | Postable text + visible voice |
| `validate-channel` | Discord | Channel validation |
| `publish-event` | Discord | Post Discord card |
| `save-event` | Discord | CRUD draft / edit / cancel / delete |
| `event-participation` | Discord | Join (smallest open convoy / waitlist) / leave (promote) |
| `add-group` | Discord | Host adds a convoy |
| `change-group-leader` | Discord | Host reassigns convoy leader (before start) |
| `balance-groups` | Discord | Reorganize convoys (`balance` / `shuffle` / `balance_shuffle`) |
| `submit-results` | Discord | Results + complete + ranked ELO; guild guests |
| `user-profile` | Discord | Profile + `driverRating` + DM prefs |
| `leaderboard` | Optional Discord | Global driver ladder |
| `launch-intent` | Discord | Embed deep-link fallback |
| `upload-cover` | Discord | Cover upload |
| `interactions-endpoint` | Ed25519 | Card buttons |
| `process-notifications` | Cron secret | DM outbox delivery |
| `prune-client-analytics` | Cron secret | 90-day prune |
| `track-event` | Optional + track secret | Client analytics ingest |
| `analytics-dashboard` | Localhost + secret | Dev dashboard |

All Activity-facing functions: **`verify_jwt = false`** in `config.toml` **and** `--no-verify-jwt` on deploy. Gateway: `apikey` + `Authorization: Bearer <anon>`. User: `x-discord-access-token`.

## Secrets

```bash
npm run sync:secrets
```

Required: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_PUBLIC_KEY`, `DISCORD_BOT_TOKEN`.

Hosted: `APP_ORIGIN=https://forza.events`, `DISCORD_REDIRECT_URI`. Optional: `DISCORD_REDIRECT_URI_ALLOWLIST`, `ALLOWED_CORS_ORIGINS`, `NOTIFICATION_CRON_SECRET`, `ANALYTICS_TRACK_SECRET`.

## Discord Interactions URL

```
https://<project-ref>.supabase.co/functions/v1/interactions-endpoint
```

## Storage: event covers

Bucket `event-covers` (public read). Writes only via `upload-cover`. Client: `uploadCoverImage(token, guildId?, eventId, file)` (`guild_id` optional for drafts).

## Sample events

```bash
npm run seed:events   # SUPABASE_SERVICE_ROLE_KEY; seed as status=draft
```

Host `000000000000000001`, guild `000000000000000001`. Do not seed `status=open` without `discord_message_id` (`NOT_DRAFT` on publish).

## Cars catalog

- `supabase/seed/fh6cars.json` / `fh5cars.json` — app search; from Fandom scrape
- `cars.game` + `events.game` (`029`); existing rows default `fh6`
- Model titles do not embed year — `cars.year` only
- `cars.abbreviation` (`039`); extra aliases → `search_text`
- `save-event` resolves by id/lookup within the event’s game only

```bash
npm run data:fh5:scrape && npm run data:fh6:scrape
npm run seed:cars
```

`seed:cars` upserts on `(game, make, model, year, pi)`, keeps `cars.id`, sets `active=false` for removed rows. Never `DELETE FROM cars` / `event_cars`. Restricted-list rows use `sort_order` (`042`) and row `id` (`043`).
