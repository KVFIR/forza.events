# Discord Activity reference

Last updated: 2026-05-27

## What matters for FORZA.EVENTS

- FORZA.EVENTS is a **Discord Activity**, not a standalone website in production.
- The UI runs in an iframe; Discord talks to the app via `@discord/embedded-app-sdk`.
- Server-side: Supabase Edge Functions + bot token for guild/channel APIs and embed posts.
- Interactions Endpoint handles embed button → `LAUNCH_ACTIVITY`.

## Entry paths

1. **App Launcher** — primary discovery inside Discord.
2. **Published event embed** — `Open in FORZA.EVENTS` → `LAUNCH_ACTIVITY` (type `12`) + `launch_intents` fallback.

Also supported by Discord: voice channels, DMs, group DMs (guild context may be null — `launch_intents.guild_id` is nullable).

## Rich Presence

Custom profile status while the Activity is open uses Embedded App SDK `setActivity()` (see [`src/lib/discordRichPresence.ts`](../src/lib/discordRichPresence.ts)).

| Requirement | Notes |
|-------------|--------|
| OAuth scope | `rpc.activities.write` — included in Activity `authorize()` (`DISCORD_ACTIVITY_OAUTH_SCOPES`) |
| When it updates | Route changes + **Event Detail** / **Results** / **Create** (draft title) screen overrides |
| Copy | Always **English** on the profile (`RICH_PRESENCE_EN` in `discordRichPresence.ts`) — UI locale does not affect Rich Presence; event types use `EVENT_TYPE_LABEL_EN` in `eventTypes.ts` |
| Event state line | Role (`Hosting`, `Registered`) or status (`Lobby full`, `Race in progress`, …) — lobby count only in `party.size`, not duplicated in `state` |
| Assets | URLs use `VITE_APP_ORIGIN` when set (Discord fetches server-side), else iframe origin — `/logo/logo.png`, bundled `/covers/*` |
| Activity type | RPC `5` (Competing) |
| Localhost | Rich Presence sync runs only in the Activity iframe (`isDiscordActivityFrame()`), not in a standalone browser tab |

After deploying a scope change, users may need to **re-open** the Activity (or use in-app auth retry) so Discord re-issues a token with `rpc.activities.write`.

## Auth flow (matches Discord docs)

1. `await sdk.ready()`
2. `sdk.commands.authorize({ client_id, response_type: 'code', scope: ['identify','guilds','rpc.activities.write'], prompt: 'none' })`
3. Backend `token-exchange` exchanges `code` for `access_token` (with allowlisted `redirect_uri`)
4. `sdk.commands.authenticate({ access_token })`

Activity redirect URI in portal: **`https://127.0.0.1`** (not the Railway deploy URL).

Local browser dev only: `http://localhost:5180/auth/callback`.

## Layout modes (focused / PIP / grid)

When users minimize the Activity, Discord sends `ACTIVITY_LAYOUT_MODE_UPDATE` (`subscribeDiscordLayoutMode` → `DiscordLayoutProvider`).

| `layout_mode` | UX in FORZA.EVENTS |
|---------------|---------------------|
| **0 — focused** | Full app (browse, create, profile, event detail) |
| **1 — PIP** | Centered FORZA.EVENTS logo only — expand the activity for controls |
| **2 — grid** | Full app (same as focused) |

We do **not** call `setOrientationLockState` — the activity follows the device orientation (portrait on phones is allowed). Logo-only mode is **not** inferred from viewport size.

## Networking (Activity proxy)

Activities are served through Discord’s proxy (`*.discordsays.com`).

| Requirement | Implementation |
|-------------|----------------|
| URL mapping | Prefix `/supabase` → `<project-ref>.supabase.co` (no `https://`, no `/.proxy/` in prefix) |
| Client rewrite | `patchUrlMappings` in `src/lib/discordUrlProxy.ts` |
| Dropped headers | `createSupabaseFetch(anonKey)` re-applies `apikey` and `Authorization` on every request |
| Cover images in UI | Discord CSP `img-src` blocks `*.supabase.co`; `coverDisplayUrl()` rewrites Storage URLs to `/supabase/...` (same-origin) |
| Browse in iframe | Prefer **`browse-events`** Edge Function over raw PostgREST |

Edge Function **CORS** allows origins: `APP_ORIGIN`, `*.discordsays.com`, `*.discord.com`, localhost dev ports, optional `ALLOWED_CORS_ORIGINS`. Requests without a matching `Origin` do not get `Access-Control-Allow-Origin` (intentional).

## Interactions Endpoint

URL:

```text
https://<project-ref>.supabase.co/functions/v1/interactions-endpoint
```

- Verifies `X-Signature-Ed25519` + `X-Signature-Timestamp` with `DISCORD_PUBLIC_KEY`
- PING → `{ "type": 1 }`
- Button `open_event:{uuid}` → `{ "type": 12 }` + optional `launch_intents` row

No CORS — Discord server-to-server only.

## Publish target (host)

| Step | API |
|------|-----|
| Servers (user ∩ bot) | `list-guilds` |
| Channels (bot can post) | `list-channels` |
| Validate selection | `validate-channel` |
| Post embed | `publish-event` |

Host must be guild member with **Manage Server** (or Administrator). Server re-validates channel permissions (bot View Channel, Send Messages, Embed Links).

**Bot install:** `scope=bot`, **Requires OAuth2 Code Grant = OFF**. User-install alone does not create a publish target.

## Operational checklist

[Discord Developer Portal](https://discord.com/developers/applications):

1. **Activities enabled** — App Launcher + `LAUNCH_ACTIVITY`.
2. **Activity URL Mapping** — `https://forzaevents.up.railway.app` (must match Railway `APP_ORIGIN`).
3. **Second mapping** — `/supabase` → `<project-ref>.supabase.co`.
4. **OAuth2 Redirects**
   - `https://127.0.0.1` — Activity (required)
   - `http://localhost:5180/auth/callback` — optional local browser dev
5. **Interactions Endpoint URL** — see above.
6. **Bot** — token in Supabase secrets; Code Grant off.
7. **Privileged Gateway Intent: Server Members** — required for `list-guild-members` (convoy leader search when creating events).
8. **Install in pilot guilds** — bot must be in server before `list-guilds` returns it.
9. **Channel permissions** — bot can post in chosen announcement channels.

### Supabase / Railway

- `npm run sync:secrets` — Discord secrets
- `npm run deploy:functions` — all Edge functions (incl. `list-guild-members`), `--no-verify-jwt`
- `supabase db push` — single baseline migration
- Railway: `APP_ORIGIN` = deploy URL; rebuild frontend after env changes

### Legal URLs (app verification)

Set in Developer Portal → **General Information**:

| Field | URL |
|-------|-----|
| Terms of Service | `https://<APP_ORIGIN>/terms` |
| Privacy Policy | `https://<APP_ORIGIN>/privacy` |

Use your Railway deploy URL (same as `APP_ORIGIN`), e.g. `https://forzaevents.up.railway.app/terms`. These paths load in a normal browser tab without the Discord-only gate, and are linked from Profile inside the Activity. Optional build-time: `VITE_LEGAL_CONTACT_EMAIL` (default `rudolfs@oas.lv`), `VITE_LEGAL_OPERATOR_NAME` (individual controller in Latvia).

### Validate in Discord

- [ ] Auth: authorize → token exchange → authenticate
- [ ] Browse / create / publish in a real server
- [ ] Embed button opens correct event
- [ ] Join/leave updates embed
- [ ] Cancel / complete updates embed appearance
- [ ] Rich Presence on profile shows current screen (Browse / event title on Detail)

## Out of MVP

Reminders, threads, participant roles, scheduled bot jobs — see [`PLAN.md`](PLAN.md).

## Links

- [`PLAN.md`](PLAN.md) — product contract
- [`STATUS.md`](STATUS.md) — implementation state
- [`DEVELOPMENT.md`](DEVELOPMENT.md) — local workflow
- [`AGENTS.md`](../AGENTS.md) — agent implementation notes
- [Embedded App SDK](https://github.com/discord/embedded-app-sdk)
- [Discord API — Interactions](https://discord.com/developers/docs/interactions/overview)
