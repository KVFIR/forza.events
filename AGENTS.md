# Agent notes — FORZA.EVENTS

Lessons from implementation work (keep in sync when behavior changes).

## Discord-only runtime (MVP)

- **Production:** primary surface is still the **Discord Activity**. Opening the **raw Railway hostname** in a browser tab shows **`DiscordOnlyGate`**. **`https://forza.events`** is a supported browser web host: Discord OAuth sign-in is required before the app — full-screen **`BrowserSignInScreen`** (no navbar) via **`useBrowserSignInGate()`** in `src/App.tsx` (`shouldRequireBrowserSignIn()` / `isPublicBrowserPath()` in `src/lib/runtime.ts`). Preview on localhost: **`/sign-in`**.
- **Not supported in prod:** standalone web sign-in on Railway/production origin; browser OAuth there is intentionally blocked (`invalid_grant` / redirect mismatch). A future standalone web product needs a **separate Discord application** — see [`docs/PLAN.md`](docs/PLAN.md).
- **Local dev exception:** `localhost` / `127.0.0.1` skip the production sign-in gate so engineers can use `npm run dev` + `/auth/callback` browser OAuth in a tab (`docs/DEVELOPMENT.md`). **Sign in:** navbar auth pill or Profile → **Sign in with Discord** (`AuthStatusIndicator` / `SignInRequiredState` + `startDiscordBrowserSignIn()` when `supportsBrowserOAuth()`).
- **Auth in Activity:** `initDiscordActivity()` → SDK `authorize` (scopes `identify`, `guilds`, `rpc.activities.write`) → `token-exchange` → `authenticate`. Guild context: `sdk.guildId` pre-fills create-event **target server** when the Activity was launched on a server. **Startup perf:** `preloadDiscordEmbeddedSdk()` in `main.tsx` (Activity iframe only); `AuthContext` clears `loading` before background `applyLaunchEventRedirect` (guild `launch-intent` only from `/`, embed `open_event:{id}` always); `token-exchange` defers `discord_guilds` upsert via `deferGuildCatalogUpsert` + `EdgeRuntime.waitUntil`. Event Detail does not block on auth except when the event is still loading or auth may be required to resolve a host draft deep link.
- **Rich Presence:** `DiscordRichPresenceSync` + `setActivity()` — English-only copy; `VITE_APP_ORIGIN` for image URLs; host/joined/viewing + event status in `state` (with `n/12` when `isPublishedToDiscord`), same count in `party.size`. Overrides on Event Detail, Results, Create (title). `resetRichPresenceSession()` on Activity re-auth. See `src/lib/discordRichPresence.ts`.
- **Implications for UI/UX** (design and copy should assume Activity, not a generic website):
  - Activity iframe sandbox blocks native `window.confirm` / `alert` / `prompt` (no `allow-modals`). Use in-app `ConfirmDialog` (`src/components/ui/ConfirmDialog.tsx`) for destructive confirmations.
  - Users always have a Discord access token when using the real product path; avoid dead-end copy like “open in Discord” on screens that only render inside Activity (e.g. Create **Target** step — `TargetStep` still shows that message when `token` is null; treat as dev/edge only).
  - **Publish target** (server + channel) is Discord-native: `list-guilds` = user guilds ∩ servers where the **bot is installed**; `list-channels` = text channels where the bot has **View Channel**, **Send Messages**, and **Embed Links**; `validate-channel` re-checks on channel select (and restored draft channel). Empty server list → **Add to server** CTA (`buildBotInstallUrl` / `openBotInstallUrl` in `src/lib/discordInstall.ts`) — callback-less bot OAuth (`scope=bot`); Activity uses `openExternalLink` → browser, then **Refresh list**. **Bot → Requires OAuth2 Code Grant must be OFF** in the Developer Portal. User-install in App Launcher does **not** add a publish target.
  - **Draft** requires `guild_id`; **publish** requires `guild_id` + `channel_id`. Channel can be chosen on Target or in the publish modal on Review — both are valid because publish always happens in Discord context.
- **Delete draft:** `save-event` with `{ delete: true }` (draft + host only). UI: Event Detail + Create Review step.
- **Save published edits:** `save-event` update uses `buildEventFields` only — never overwrites `status` (avoids reverting `open` → `draft`).
- **Post-start host:** Event Detail shows separate **Submit results** + **Cancel event** buttons; cancel syncs Discord embed via `syncPublishedEmbed`.
- **Join/leave:** `event-participation` validates gamertag server-side, ensures `users` row exists, DB trigger `enforce_event_participant_capacity` prevents over-capacity races; **leave locked after event start** (`canLeaveEvent` / `canLeaveRegistration`). Join/leave/cancel/results sync published embed via `syncPublishedEmbedByEventId`. Profile `events_joined` synced via DB trigger (baseline).
  - After publish, server and channel are **locked** in the form (`lockGuild` / `lockChannel`).
  - **Publish embed:** `buildEventEmbed` — date, tracks (`name` + optional `share_code` + optional `format` in `events.tracks` jsonb), cars, participants `current/12`, optional restrictions (plain text). Legacy `event_share_code` / `track_codes` still read for old rows. **Status on embed:** `cancelled` / `completed` / `archived` show a Status field, title prefix, grey/green color, and disabled or relabelled button. Sync on join/leave, save/cancel, submit-results. Failed PATCH logs structured JSON (`embedSync` returns `{ok:false}`). Button `open_event:{id}` → `interactions-endpoint` stores `launch_intents` (nullable `guild_id` for DMs) → navigate from `sdk.customId` or `launch-intent` fallback. Browse loads immediately and does not wait on auth.
  - Browse/join/create/publish all depend on Edge Functions + Discord token headers; test in Discord after API/proxy changes, not only localhost. Interactions Endpoint URL must be set in Discord Developer Portal.

## Product / data model

- **Roles (do not conflate):**
  - **Organiser (display only):** `resolveOrganiserLabel()` in `src/lib/organiser.ts` — `guildName` when set, else `hostUsername`. Used on event cards and detail (`by …`). Not a DB column.
  - **`users.username`:** Discord unique handle (`user.username` from Discord API), not `global_name`, server nick, or display name. Stored via `discordUniqueUsername()` / `ensureDiscordUserRow()` on auth, join, and profile save; convoy leader assignment uses `lobby_leader_username` or Bot API `GET /users/{id}` when the DB row is missing or stale. UI prefixes `@` via `formatDiscordHandle()` only.
  - **Host (`host_discord_id`):** Discord user who created the event; all edit/publish/delete/cancel/results permissions stay on the host. Hosts never use Join/Leave (`event-participation` rejects host join).
  - **Guild display names:** placeholder `Server` is not shown as organiser (`guildDisplay.ts`); `PublishTargetPicker` syncs the real name from `list-guilds` after load.
  - **Convoy leader:** in-game Forza lobby leader (Xbox gamertag); may differ from the host. **Source of truth:** `event_participants.is_convoy_leader` + `participation_source` (`self_join` | `host_assigned` | `host_self_assigned`). `events.lobby_leader_*` is a denormalized projection updated on save. Leader always has a participant row; `max_players` / `current_players` count all racers (12 total). Assigned leaders cannot leave until the host picks someone else (`LEADER_CANNOT_LEAVE`). `Joined` / `userIsJoined()` = `participation_source === 'self_join'` only (host system rows do not count).
  - **Publish target:** `guild_id` + `channel_id` (Discord server + announcement channel). MVP still requires `guild_id` on draft; optional guild for personal events is deferred.
- **Event types:** `road` (Road racing), `dirt`, `cruise`. Labels/colors live in `src/lib/eventTypes.ts` and `supabase/functions/_shared/eventTypes.ts`. Type is required on save/publish; track share codes are optional. Legacy `touge`/`drift` removed in migration `005` (remap: touge→road, drift→cruise).
- **Draft events** (`status: draft`) are **not** in the public browse feed. RLS policy `status != 'draft'` blocks anon PostgREST reads.
- Hosts see drafts only via **authenticated Edge paths** (`host-drafts` or `browse-events` with `host_drafts: true` + `x-discord-access-token`).
- **My Events** merges host drafts **on top** for scopes `all` and `hosted`; **Joined** has no drafts.
- Draft cards link to `/create?edit={id}`, not `/event/{id}`. After first save, navigate to `/my-events`.
- Do not treat `draftsLoadError` as `loadError` for the whole list — published events can load while drafts fail.

## Supabase Edge Functions

### JWT verification (`verify_jwt`)

- New functions default to **`verify_jwt = true`** unless configured otherwise.
- Activity-first functions (`token-exchange`, `save-event`, `browse-events`, `host-drafts`, etc.) use **`verify_jwt = false`** because auth is **`x-discord-access-token`** + `verifyDiscordToken()`, not Supabase user JWT.
- **Always deploy** public/browse/draft functions with:
  ```bash
  npx supabase functions deploy browse-events host-drafts --no-verify-jwt
  ```
  or `npm run deploy:functions` (script uses `--no-verify-jwt` for every function).
- `supabase/config.toml` must list `[functions.browse-events]` and `[functions.host-drafts]` with `verify_jwt = false`. Config alone is not enough if a one-off deploy omitted `--no-verify-jwt`.

### Gateway 401 vs app 401

| Symptom | Likely cause |
|--------|----------------|
| `UNAUTHORIZED_NO_AUTH_HEADER` / missing authorization | Gateway: no `Authorization` and/or `verify_jwt` still true |
| `{"error":"Unauthorized"}` from function body | App: invalid/expired Discord token on `host-drafts` / `host_drafts` |

- With `verify_jwt = false`, gateway accepts **`apikey`** alone (verified via curl).
- With `verify_jwt = true`, gateway expects **`Authorization: Bearer <SUPABASE_ANON_KEY>`** (anon key is a valid JWT).

## Discord Activity proxy

- URL mapping: prefix `/supabase` → `{project-ref}.supabase.co`. Client keeps real `VITE_SUPABASE_URL`; `patchUrlMappings` rewrites fetches.
- **Cover images in Activity:** Discord CSP `img-src` allows `'self'` and Discord CDNs only — not `*.supabase.co`. `coverDisplayUrl()` rewrites Storage/render URLs to `/supabase/...` for `<img>` (fetch proxy does not apply to `img src`).
- **Publish target lists:** `list-guilds` intersects user guilds with **one** cached `GET /users/@me/guilds` (bot token), not N× `GET /guilds/{id}`. `list-channels` fetches user guilds once; channel permissions include **category** overwrites. Load channels only after guild list finishes (client).
- Discord’s proxy often **drops `apikey` and `Authorization`** on forwarded requests (documented for PostgREST; applies to `/functions/v1` too).
- **Fix:** In the Activity iframe, route Edge `fetch` through **`createSupabaseFetch(anonKey)`** (`src/lib/supabaseEnv.ts`) so headers are re-applied on every request — same pattern as the Supabase JS client.
- Plain `fetch()` to `functions/v1/*` from `api.ts` **without** that wrapper will 401 in Discord even if localhost works.

## Client API (`src/lib/api.ts`)

- All `invoke()` calls should set **`apikey`** and **`Authorization: Bearer <anon>`**.
- When `isDiscordActivityFrame()`, use **`createSupabaseFetch(anonKey)`** as the fetch implementation for `invoke()`.
- Pass Discord user token only in **`x-discord-access-token`**, never replace the Supabase Bearer with the Discord token.

## Auth / session

- `isSignedIn` = `user.discordId` **and** `getDiscordAccessToken()`.
- Saving drafts can work (token in module) while **My Events** stays empty if React `user` is still `GUEST_USER` — e.g. OAuth callback called `setDiscordSession` but not **`refreshUser`**.
- `AuthCallback` should `refreshUser(result.user)` after token exchange; use **`exchangeTokenOnce()`** so React StrictMode does not double-exchange the OAuth `code`.
- Optional: sync `loadDiscordSession()` into context on mount if session exists but state is stale.

## Deploy checklist (when touching events browse/drafts)

1. `npm run deploy:functions` or deploy `browse-events` + `host-drafts` with **`--no-verify-jwt`**
2. Ship frontend (Railway) after any `api.ts` / proxy fetch changes
3. Hard refresh in Discord Activity
4. Run P0 checks in [`docs/E2E.md`](docs/E2E.md) when changing auth, browse, publish, or embed sync

## Internationalization (i18n)

- **Stack:** `i18next` + `react-i18next`; locale files `src/i18n/locales/en.json` and `ru.json`.
- **Default language:** English. First visit (no `forza.language` in `localStorage`) uses `detectBrowserLanguage()` from `navigator.languages`. Explicit choice is stored in `localStorage` and toggled via **EN | RU** on the profile card.
- **UI copy:** use `useTranslation()` / `t('key')` in React; non-React helpers use `i18n.t` from `src/i18n` (e.g. validation, `eventTypeLabel`, `participationButtonLabel`).
- **Dates:** pass `dateFnsLocale()` from `src/i18n/dateLocale.ts` into `date-fns` `format` / `formatInTimeZone`.
- New user-facing strings: add keys to **both** `en.json` and `ru.json`.

## Security (Edge + Storage + RLS)

- **Mutations** use Edge Functions + `verifyDiscordToken()`; Postgres RLS is read-only for anon on sensitive tables.
- **Cover uploads:** `upload-cover` only (host + matching `guild_id`/`event_id`); baseline schema drops anon storage write policies on `event-covers`.
- **Publish target:** `publish-event` and `validate-channel` call `validatePublishChannelTarget`; user must be guild member with Manage Server (`guildAccess.ts`).
- **OAuth:** `token-exchange` whitelists `redirect_uri` via `oauthRedirect.ts` (+ optional `DISCORD_REDIRECT_URI_ALLOWLIST`).
- **Cars catalog:** `save-event` resolves cars by id or `(make, model, year, pi)` on active rows only — no client-driven inserts into `cars`. Refresh prod: `npm run data:fh6:scrape` then `npm run seed:cars` (upsert via `006_cars_catalog_sync`; never `DELETE FROM cars` / `event_cars`).
- **Results:** `submit-results` requires `discord_id` in `event_participants`.
- After publish, `assertTargetNotLocked` blocks changing `guild_id` and `channel_id` on save.
- **Anon PostgREST reads (baseline RLS + `003_security_publish_results`):** `users` / `event_participants` / `event_results` / `event_cars` only for non-draft events (or tied rows) — not full-table scraping.
- **Publish lock:** `events.publish_started_at` — `publish-event` claims before Discord POST, finalizes atomically, deletes orphan message on DB failure; stale lock reclaims after 5 min (`_shared/publishLock.ts`).
- **Results atomicity:** `submit_event_results` RPC (Postgres transaction) — `submit-results` validates in Edge then calls RPC.
- **CORS:** Edge Functions use `corsHeadersFor(req)` — reflect allowlisted origins (`APP_ORIGIN`, localhost dev ports, `*.discordsays.com`, `*.discord.com`, optional `ALLOWED_CORS_ORIGINS`); no `Access-Control-Allow-Origin: *`.
- **Rate limits:** `check_api_rate_limit` RPC (Postgres, global) via `enforceRateLimit` / `rateLimitPresets.ts` on browse + auth + mutations; **fail-closed** if RPC fails (429, no per-isolate memory fallback).
- **500 responses:** Edge uses `databaseErrorResponse()` / `internalErrorResponse()` — never raw Postgres `error.message` to clients.
- **Convoy leader:** non-host leaders must be guild members (`isUserMemberOfGuild` bot API) when `guild_id` is set on save; Discord lookup failures return `CONVOY_LEADER_GUILD_CHECK_FAILED` (not `NOT_IN_GUILD`).
- **Host drafts:** `host-drafts` / `browse-events?host_drafts` filter `status = draft` only.
- **SPA:** CSP + `frame-ancestors` for Discord embed in `index.html`; `npm overrides` pins `esbuild` ≥ 0.25.
- Deploy **`upload-cover`** with other functions (`npm run deploy:functions`). Apply migrations with `supabase db push` after linking the project (`001`–`006`; see [`supabase/README.md`](supabase/README.md)).
- **Docs:** keep [`docs/STATUS.md`](docs/STATUS.md), [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md), [`docs/E2E.md`](docs/E2E.md), [`supabase/README.md`](supabase/README.md) in sync when migrations, function list, or Activity flows change.

## Policy / UI / browse changes (keep in sync)

When changing **browse feed filters**, **host cancel or results UI/rules**, or **auth/session** behavior, update together:

1. **`src/lib/eventSpec.ts`** and **`supabase/functions/_shared/eventSpec.ts`** (keep identical; run `npm test` / `tests/validationParity.test.ts` if validation codes move).
2. **`docs/E2E.md`** — manual Activity QA sections affected (Browse §3, host cancel/results §5–6, auth §1).
3. **`docs/DEVELOPMENT.md`** — only if **localhost** behavior changes (e.g. PostgREST vs `browse-events`, OAuth, Browse filters).

Also align **`browse-events`** / **`src/lib/events.ts`** if the server list query diverges from `isBrowseFeedEvent`. Run P0 in [`docs/E2E.md`](docs/E2E.md) after shipping.

## CI / tests

- **CI:** `.github/workflows/ci.yml` — `npm ci` → `typecheck` → `lint` → `test` → `build`.
- **Unit tests:** Vitest on pure logic (`src/lib/eventSpec`, `gamertag`, `datetime`, parity with `supabase/functions/_shared/eventSpec`). Run `npm test`.
- **API errors:** Edge responses include `code` where possible; client maps via `mapApiError()` / `ApiRequestError` in `src/lib/apiErrors.ts`. Keep `src/lib/validationCodes.ts` and `supabase/functions/_shared/validationCodes.ts` in sync.
- **500 responses:** use `internalErrorResponse()` — never `String(e)` to clients.

## References

- [`docs/STATUS.md`](docs/STATUS.md) — current feature matrix and migrations
- [`docs/ENGINEERING.md`](docs/ENGINEERING.md) — quality bar (CI, tests, error codes)
- [`docs/BACKLOG.md`](docs/BACKLOG.md) — post-MVP planned features (update when adding or shipping backlog items)
- [`docs/DISCORD_PLATFORM.md`](docs/DISCORD_PLATFORM.md) — proxy mapping, portal checklist
- [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) — local OAuth, quick testing checklist
- [`docs/E2E.md`](docs/E2E.md) — manual Discord Activity QA matrix
- [`supabase/README.md`](supabase/README.md) — migrations `001`–`006`, Edge Functions
- [`scripts/deploy-edge-functions.sh`](scripts/deploy-edge-functions.sh) — canonical function list (15)
- **Convoy leader:** `events.lobby_leader_discord_id` + `event_participants.is_convoy_leader` / `participation_source` (in baseline `001`); pick via `list-guild-members` on Create → Target; host leader uses `host_discord_id`; results roster includes leader without Join when id is set.
