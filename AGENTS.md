# Agent notes — FORZA.EVENTS

Lessons from implementation work (keep in sync when behavior changes).

## Discord-only runtime (MVP)

- **Production:** primary surface is still the **Discord Activity**. Opening the **raw Railway hostname** in a browser tab shows **`DiscordOnlyGate`**. **`https://forza.events`** is a supported browser web host: Discord OAuth sign-in is required before the app — full-screen **`BrowserSignInScreen`** (no navbar) via **`useBrowserSignInGate()`** in `src/App.tsx` (`shouldRequireBrowserSignIn()` / `isPublicBrowserPath()` in `src/lib/runtime.ts`). **Public without sign-in in a browser tab:** `/auth/callback`, `/terms`, `/privacy` only. All other routes (Browse, Event Detail, Results, Profile, …) require Discord OAuth on **`forza.events`** and **`localhost`**. **Browser Supabase access:** on `forza.events`, `resolveSupabaseUrl()` (`src/lib/supabaseEnv.ts`) routes API/Storage through same-origin `/supabase/*`; Cloudflare Worker (`cloudflare/supabaseProxy.js`, `wrangler.toml` route `forza.events/supabase/*`) proxies to `*.supabase.co` where direct Supabase is blocked. Activity iframe still uses Discord URL mapping + `patchUrlMappings`, not this path. **Link previews** (Discord/Slack/Telegram unfurl): Cloudflare Worker on `forza.events/event/*` serves OG HTML to crawlers (`shared/eventPageMeta.mjs`, `cloudflare/eventOgHandler.js`); needs Worker secret `SUPABASE_ANON_KEY`. Client updates `document.title` + meta via `usePageMeta` on Event Detail/Results. Preview on localhost: **`/sign-in`**.
- **Not supported in prod:** standalone web sign-in on Railway/production origin; browser OAuth there is intentionally blocked (`invalid_grant` / redirect mismatch). A future standalone web product needs a **separate Discord application** — see [`docs/PLAN.md`](docs/PLAN.md).
- **Local dev exception:** `localhost` / `127.0.0.1` are supported **browser web hosts** (same sign-in gate as `forza.events`) so engineers can use `npm run dev` + `/auth/callback` browser OAuth in a tab (`docs/DEVELOPMENT.md`). **Sign in:** navbar auth pill or Profile → **Sign in with Discord** (`AuthStatusIndicator` / `SignInRequiredState` + `startDiscordBrowserSignIn()` when `supportsBrowserOAuth()`). **Create/publish in browser:** `forza.events` and `localhost` use the same Edge paths as Activity after OAuth (`save-event`, `publish-event`, `list-guilds`); target server is manual (no `sdk.guildId` pre-fill).
- **Auth in Activity:** `initDiscordActivity()` → SDK `authorize` (scopes `identify`, `guilds`, `rpc.activities.write`) → `token-exchange` → `authenticate`. Guild context: `sdk.guildId` pre-fills create-event **target server** when the Activity was launched on a server. **Startup perf:** `preloadDiscordEmbeddedSdk()` in `main.tsx` (Activity iframe only); `AuthContext` clears `loading` before background `applyLaunchEventRedirect` (guild `launch-intent` only from `/`, embed `open_event:{id}` always); `token-exchange` defers `discord_guilds` upsert via `deferGuildCatalogUpsert` + `EdgeRuntime.waitUntil`. Event Detail does not block on auth except when the event is still loading or auth may be required to resolve a host draft deep link.
- **Rich Presence:** `DiscordRichPresenceSync` + `setActivity()` — English-only copy; `VITE_APP_ORIGIN` for image URLs; host/joined/viewing + event status in `state` (with `current/total` lobby count when `isPublishedToDiscord`, total = `groupCount * maxPlayers`), same count in `party.size`. Overrides on Event Detail, Results, Create (title). `resetRichPresenceSession()` on Activity re-auth. See `src/lib/discordRichPresence.ts`.
- **Implications for UI/UX** (design and copy should assume Activity, not a generic website):
  - Activity iframe sandbox blocks native `window.confirm` / `alert` / `prompt` (no `allow-modals`). Use in-app `ConfirmDialog` (`src/components/ui/ConfirmDialog.tsx`) for destructive confirmations.
  - Users always have a Discord access token when using the real product path; avoid dead-end copy like “open in Discord” on screens that only render inside Activity (e.g. Create **Target** step — `TargetStep` still shows that message when `token` is null; treat as dev/edge only).
  - **Publish target** (server + channel) is Discord-native: `list-guilds` = user guilds with **Manage Server** (or Administrator) ∩ servers where the **bot is installed** (empty manageable list falls back to all user guilds with bot, but publish still requires Manage Server); `list-channels` = text channels where the bot has **View Channel**, **Send Messages**, and **Embed Links**; client trusts `list-channels` (in-flight dedupe + 30s cache in `apiDedup.ts`; **Refresh** bypasses cache). **Draft save** with `guild_id` set needs guild **membership** only (`resolveGuildNameForUser` on `save-event`); **publish** and channel pick require **Manage Server** / Administrator (`requireManageGuildAccess` on `list-channels`, `validate-channel`, `publish-event`). Empty server list → **Add to server** CTA (`buildBotInstallUrl` / `openBotInstallUrl` in `src/lib/discordInstall.ts`) — callback-less bot OAuth (`scope=bot`); Activity uses `openExternalLink` → browser, then **Refresh list**. **Bot → Requires OAuth2 Code Grant must be OFF** in the Developer Portal. User-install in App Launcher does **not** add a publish target.
  - **Draft** may omit `guild_id` (migration `014`); **publish** requires `guild_id` + `channel_id`. Channel can be chosen on Target or in the publish modal on Review — both are valid because publish always happens in Discord context.
- **Delete draft:** `save-event` with `{ delete: true }` (draft + host only). UI: Create flow publish step only (`/create?edit={id}`).
- **Save published edits:** `save-event` update uses `buildEventFields` only — never overwrites `status` (avoids reverting `open` → `draft`).
- **Post-start host:** Event Detail shows separate **Submit results** + **Cancel event** buttons; cancel syncs Discord embed via `syncPublishedEmbed`.
- **Join/leave:** `event-participation` validates gamertag server-side, ensures `users` row exists, DB trigger `enforce_event_participant_capacity` prevents over-capacity races; **leave locked after event start** (`canLeaveEvent` / `canLeaveRegistration`). Join/leave/cancel/results sync published embed via `syncPublishedEmbedByEventId` (response includes `embed_synced`; failures logged as structured JSON). `JoinedEventsContext` clears optimistic overrides after successful join/leave. Profile `events_joined` synced via DB trigger (baseline).
  - After publish, server and channel are **locked** for everyone including the host (`lockGuild` / `lockChannel` in UI; `assertTargetNotLocked` on `save-event`). Discord **Manage Server** / Administrator does **not** grant app-side edit or relocate rights — only `host_discord_id`. Embed relocate (POST new + DELETE old) is not implemented; cancel + recreate is the workaround.
  - **Publish embed:** `buildEventEmbed` — date, tracks (`name` + optional `share_code` + optional `format` in `events.tracks` jsonb), cars, participants `current/12`, optional restrictions (plain text). **About** field shows `event.description` verbatim (no title-line stripping). Legacy `event_share_code` / `track_codes` still read for old rows. **Status on embed:** `cancelled` / `completed` / `archived` show a Status field, title prefix, grey/green color, and disabled or relabelled button. Sync on join/leave, save/cancel, submit-results. Failed PATCH logs structured JSON (`embedSync` returns `{ok:false}`). Button `open_event:{id}` → `interactions-endpoint` stores `launch_intents` (nullable `guild_id` for DMs) → navigate from `sdk.customId` or `launch-intent` fallback. Browse loads immediately and does not wait on auth.
  - Browse/join/create/publish all depend on Edge Functions + Discord token headers; test in Discord after API/proxy changes, not only localhost. Interactions Endpoint URL must be set in Discord Developer Portal.

## Product / data model

- **Roles (do not conflate):**
  - **Organiser (display only):** `resolveOrganiserLabel()` in `src/lib/organiser.ts` — `guildName` when set, else `hostUsername`. Used on event cards and detail (`by …`). Not a DB column.
  - **`users.username`:** Discord unique handle (`user.username` from Discord API), not `global_name`, server nick, or display name. Stored via `discordUniqueUsername()` / `ensureDiscordUserRow()` on auth, join, and profile save; convoy leader assignment uses `lobby_leader_username` or Bot API `GET /users/{id}` when the DB row is missing or stale. UI prefixes `@` via `formatDiscordHandle()` only.
  - **Host (`host_discord_id`):** Discord user who created the event; all edit/publish/delete/cancel/results permissions stay on the host. Hosts never use Join/Leave (`event-participation` rejects host join).
  - **Guild display names:** placeholder `Server` is not shown as organiser (`guildDisplay.ts`); `PublishTargetPicker` syncs the real name from `list-guilds` after load.
  - **Convoy leader:** in-game Forza lobby leader (Xbox gamertag); may differ from the host. **Source of truth:** `event_participants.is_convoy_leader` + `participation_source` (`self_join` | `host_assigned` | `host_self_assigned`). `events.lobby_leader_*` is a denormalized projection updated on save (leader of **group 1**); `mapDbEvent` reads denormalized leader from the **group 1** convoy-leader participant row only. `syncConvoyLeaderParticipant` only clears/upserts **group 1** leader rows — groups 2+ leaders are untouched on save/publish. Each group has its own convoy leader. Leader always has a participant row; `max_players` is capacity **per group** and `current_players` counts all active racers across groups. Assigned leaders cannot leave until the host picks someone else (`LEADER_CANNOT_LEAVE`). `Joined` / `userIsJoined()` = `participation_source === 'self_join'` only (host system rows do not count). **Group-aware roster helpers** (`eventRoster.ts`): `resolveGroupConvoyLeader`, `resolveViewerConvoyLeader`, `viewerIsConvoyLeader` — leaders in groups 2+ block Leave; Xbox join hint (`showJoinXboxHint` in `eventDetailView.ts`) shows only for **active** (non-waitlisted) joined racers and names the convoy leader of **their** group.
  - **Groups & waitlist** (`007_event_groups_waitlist.sql`, migration 006 is `cars_catalog_sync`): base group = 12 seats; a host may add up to `MAX_GROUPS = 5` groups (total 12/24/36/48/60). `events.group_count`, `event_participants.group_index` (1..group_count; meaningful when `waitlisted = false`), `event_results.group_index`; leader/position unique indexes are **per group**. **Join** (`event-participation`) routes to the first open group, else `waitlisted = true` (queue ordered by `joined_at`); **leave** of an active seat auto-promotes the earliest waitlisted racer into that group. **Add group** (`add-group`, host-only, published, not started/finalized, `group_count < 5`, `lobbyIsFull`, waitlist ≥ 1; RPC guard in `009_add_group_lobby_full_guard.sql` → `LOBBY_NOT_FULL`) resolves the new group's leader (a waitlisted racer or a guild member), bumps `group_count`, and auto-fills the group from the queue. Capacity trigger counts per `group_index`; `update_current_players` / `sync_user_events_joined` also fire on UPDATE to track waitlist↔active transitions. Client helpers: `totalCapacity` / `groupIsFull` / `firstOpenGroupIndex` / `lobbyIsFull` / `canAddGroup` / `waitlistCount` (`src/lib/eventSpec.ts`); server routing in `_shared/eventGroups.ts`. **Roster order (client):** `compareParticipantsByJoinedAt` / `sortParticipantsByJoinedAt` in `eventRoster.ts` — `joined_at` asc, tie-break `discord_id`; used for drivers per group, waitlist, `resolveRegisteredDrivers`, and `resolveResultsRoster` (initial Results entry order). Load path: `order: joined_at` on `event_participants` in `events.ts` + `mapDbEvent`, and in `_shared/eventListSelect.ts` for Edge browse/draft lists — **deploy functions** when `eventListSelect` changes. Embed shows one field per active group (leader + `n/12`) plus a waitlist count. Results are entered and displayed **per group** (positions restart at 1). Create flow is unchanged (always `group_count = 1`).
  - **Event Detail participants UI** (`EventDetailParticipants`, `ParticipantDisplayNames`): per-group **2-column grid** — convoy leader card first (always **green** border), then drivers sorted by `joined_at`. **Seat numbers** restart at 1 per group (leader = #1). **Self** = purple border only — no `youSuffix` text on cards. **Badges** on the right: `convoyLeaderBadgeShort` + stacked `hostBadgeShort` when leader is host. `ParticipantDisplayNames`: gamertag primary; Discord `@handle` second line for **all viewers** when both exist (not host-only). Section header has no aggregate `n/N` lobby count (shown elsewhere on the page). Waitlist uses queue position numbers.
  - **Publish target:** `guild_id` + `channel_id` (Discord server + announcement channel). Drafts may save without `guild_id`; publish always requires both.
- **Event types:** `road` (Road racing), `dirt`, `cruise`. Labels/colors live in `src/lib/eventTypes.ts` and `supabase/functions/_shared/eventTypes.ts`. Type is required on save/publish; track share codes are optional. Legacy `touge`/`drift` removed in migration `005` (remap: touge→road, drift→cruise).
- **Draft events** (`status: draft`) are **not** in the public browse feed. RLS policy `status != 'draft'` blocks anon PostgREST reads. **Client draft vs published:** `isPublishedToDiscord` / `isDraftEvent` key off `discord_message_id`, not `status` alone — `status=open` without `discord_message_id` shows as draft in UI but `publish-event` rejects (`NOT_DRAFT`); use `status=draft` when seeding test rows.
- Hosts see drafts only via **authenticated Edge paths** (`host-drafts` or `browse-events` with `host_drafts: true` + `x-discord-access-token`).
- **My Events** merges host drafts **on top** for scopes `all` and `hosted`; **Joined** has no drafts. `useMyEventsCatalog` gates the list via `resolveMyEventsCatalogLoading` until Discord auth resolves and host drafts load (avoids a published-only flash before drafts).
- Draft cards link to `/create?edit={id}`, not `/event/{id}`. **Save as draft** (any step) navigates to `/event/{id}` after a successful save.
- Do not treat `draftsLoadError` as `loadError` for the whole list — published events can load while drafts fail.
- **Create flow:** form state lives in `useCreateEventForm`; server drafts via explicit **Save** / **Save as draft** (`persistDraft()` → `save-event`) only — no autosave, session WIP, or leave guard. **Publish** (`executePublish` / publish modal) runs `persistDraft()` then `publish-event` — no prior Save required. `PublishTargetPicker` guild-name sync must not clear `channel_id` when `guild_id` is unchanged (`onGuildChange` only resets channel on real guild change).

## Supabase Edge Functions

### JWT verification (`verify_jwt`)

- New functions default to **`verify_jwt = true`** unless configured otherwise.
- Activity-first functions (`token-exchange`, `save-event`, `browse-events`, `host-drafts`, etc.) use **`verify_jwt = false`** because auth is **`x-discord-access-token`** + `verifyDiscordToken()`, not Supabase user JWT.
- **`verifyDiscordToken`:** 30s per-isolate cache; Discord **429** throws `DiscordRateLimitError` (callers return 503), not `null`/401.
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
- **Browser OAuth session** (`discordAuth.ts`): token + user in **`localStorage`** (migrates legacy `sessionStorage` on read) so sign-in survives new tabs from Discord embed links; Activity iframe auth stays in-memory + same keys on the Activity origin only.
- Saving drafts can work (token in module) while **My Events** stays empty if React `user` is still `GUEST_USER` — e.g. OAuth callback called `setDiscordSession` but not **`refreshUser`**.
- `AuthCallback` should `refreshUser(result.user)` after token exchange; use **`exchangeTokenOnce()`** so React StrictMode does not double-exchange the OAuth `code`.
- **Stale token:** `api.ts` `invoke()` on Edge **401** dispatches `SESSION_EXPIRED_EVENT` (`src/lib/sessionEvents.ts`); `AuthContext` clears session and resets to guest — no `refresh_token` flow.
- **Browser sign-out:** standalone browser (`isStandaloneBrowser()`) shows **Sign out only** in `AuthStatusIndicator` when signed in (no paired Online/Local status pill — either/or). `signOutBrowser` clears session, `saveAuthReturnTo` current path, then `navigate('/sign-in', {replace: true})`; Activity auth path unchanged.
- Optional: sync `loadDiscordSession()` into context on mount if session exists but state is stale.

## Deploy checklist (when touching events browse/drafts)

1. `supabase db push` when migrations changed
2. `npm run deploy:functions` or deploy `browse-events` + `host-drafts` with **`--no-verify-jwt`**
3. `npx wrangler deploy` when Cloudflare Worker changes (`cloudflare/supabaseProxy.js`, `eventOgHandler.js`)
4. Ship frontend (Railway) after any `api.ts` / proxy fetch changes
5. Hard refresh in Discord Activity
6. Run P0 checks in [`docs/E2E.md`](docs/E2E.md) when changing auth, browse, publish, or embed sync

## Navigation / redirects

- **Helpers:** `src/lib/returnTo.ts` (browser OAuth `auth_return_to` in `sessionStorage`, allowlist via `isSafeReturnPath`) and `src/lib/navigationState.ts` (`location.state.from` for Event Detail back). **`ALLOWED_EXACT` in `returnTo.ts` must stay aligned with `App.tsx` routes** when adding new top-level pages.
- **Browser OAuth:** `startDiscordBrowserSignIn()` saves current path → `AuthCallback` uses `consumeAuthReturnTo('/')`; errors call `clearAuthReturnTo()`.
- **Event Detail back:** `EventCard` sets `state.from` (list pathname). Propagated Detail → Results → Detail and after host submit. Fallback: draft host → `/my-events`, else `/`. Create publish/save-published sets `from: '/my-events'`.
- **Post-commit:** use `navigate(..., {replace: true})` after login, publish, delete, and deep-link launch (`launchRedirect.ts`).
- **Limitation:** `from` lives in `location.state` only — **hard refresh drops referrer** (back falls back to Browse / My Events). Not stored in `sessionStorage`.

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
- **Cars catalog:** `save-event` resolves cars via `resolveEventCars()` **before** insert/update (avoids orphan drafts on `CARS_UNRESOLVED`); matches by id or `(make, model, year, pi)` on active rows only — no client-driven inserts into `cars`. Refresh prod: `npm run data:fh6:scrape` then `npm run seed:cars` (upsert via `006_cars_catalog_sync`; never `DELETE FROM cars` / `event_cars`).
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
- Deploy **`upload-cover`** with other functions (`npm run deploy:functions`). Apply migrations with `supabase db push` after linking the project (`001`–`010`; see [`supabase/README.md`](supabase/README.md)). **Never edit migrations already applied on remote** — add a new numbered migration instead (e.g. `LOBBY_NOT_FULL` guard shipped as `009` after `008` was deployed).
- **Docs:** keep [`docs/STATUS.md`](docs/STATUS.md), [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md), [`docs/E2E.md`](docs/E2E.md), [`supabase/README.md`](supabase/README.md) in sync when migrations, function list, or Activity flows change.

## Policy / UI / browse changes (keep in sync)

When changing **browse feed filters**, **host cancel or results UI/rules**, or **auth/session** behavior, update together:

1. **`src/lib/eventSpec.ts`** and **`supabase/functions/_shared/eventSpec.ts`** (keep identical; run `npm test` / `tests/validationParity.test.ts` if validation codes move).
2. **`docs/E2E.md`** — manual Activity QA sections affected (Browse §3, host cancel/results §5–6, auth §1).
3. **`docs/DEVELOPMENT.md`** — only if **localhost** behavior changes (e.g. PostgREST vs `browse-events`, OAuth, Browse filters).

Also align **`browse-events`** / **`src/lib/events.ts`** if the server list query diverges from `isBrowseFeedEvent`. **Browse realtime:** `patchEventLobby` must patch `group_count` (with `current_players` / `status`) so cards do not stick at Full after Add group. Run P0 in [`docs/E2E.md`](docs/E2E.md) after shipping.

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
- [`supabase/README.md`](supabase/README.md) — migrations `001`–`010`, Edge Functions
- [`scripts/deploy-edge-functions.sh`](scripts/deploy-edge-functions.sh) — canonical function list (16; includes `add-group`)
- **Convoy leader:** `events.lobby_leader_discord_id` + `event_participants.is_convoy_leader` / `participation_source` (in baseline `001`); pick via `list-guild-members` on Create → Target; host leader uses `host_discord_id`; results roster includes leader without Join when id is set.

## Learned User Preferences

- Agent replies in Russian; UI copy, commits, and project docs stay in English (i18n for UI strings).
- Roster self-indication via card border colors (purple = viewer), not inline "You" labels on participant cards.
- Discord `@handle` under gamertag on participant cards is intentionally visible to all viewers, not host-only.

## Learned Workspace Facts

- Seeding test events for publish flow: use `status = draft` — `status = open` without `discord_message_id` blocks `publish-event` (`NOT_DRAFT`) while UI still treats the row as a draft.
- Local one-off SQL seeds with real Discord IDs (e.g. `scripts/seed-test-waitlist-13.sql`) are dev-only and typically excluded from commits.
- PostgreSQL `coalesce(smallint_col, 1)` infers as `integer`, not `smallint` — passing the result to a `smallint` RPC arg causes runtime `42883` (function not found). Use `1::smallint` or add an `integer` overload that casts to `smallint`.
- Migrations `011`–`013` hardened group/waitlist RPCs for this pattern (`leave_event_participant`, `promote_waitlist_to_group`, `add_event_group`, `submit_event_results`).
- `event-participation` routes RPC failures through shared `responseForRpcError` (`rpcErrors.ts`); known Postgres `RAISE EXCEPTION` codes (`EVENT_FULL`, `LEADER_CANNOT_LEAVE`, `INVALID_GROUP_INDEX`, etc.) map to client API codes — unmapped codes still become generic internal errors.
