# Discord Activity reference

Last updated: 2026-09-15

- Primary surface is a **Discord Activity** (iframe + `@discord/embedded-app-sdk`). `https://forza.events` is a guest browser showcase; the raw Railway hostname is not.
- Server-side: Supabase Edge Functions + bot token for guild/channel APIs and card posts.
- Interactions Endpoint handles embed buttons → `LAUNCH_ACTIVITY` / join / results.

Application verification is **approved** (2026-05-31). Terms and Privacy on `APP_ORIGIN` must stay reachable and match Developer Portal → **General Information**.

## Entry paths

1. **App Launcher** — primary discovery inside Discord.
2. **Published event card** — `Open in FORZA.EVENTS` → `LAUNCH_ACTIVITY` (type `12`) + `launch_intents` fallback; `join_event:{uuid}` joins in-channel.

Also: voice channels, DMs, group DMs (`launch_intents.guild_id` may be null).

## Rich Presence

SDK `setActivity()` — [`src/lib/discordRichPresence.ts`](../src/lib/discordRichPresence.ts). Scope `rpc.activities.write`. Copy is always **English**. Event line includes role/status and `n/N` when published (`party.size` too). Image URLs use `VITE_APP_ORIGIN`. Type RPC `5` (Competing). Sync runs only in the Activity iframe. After a scope change, re-open the Activity so Discord re-issues the token.

## Auth (Activity)

1. `await sdk.ready()`
2. `sdk.commands.authorize({ client_id, response_type: 'code', scope: ['identify','guilds','rpc.activities.write'], prompt: 'none' })`
3. `token-exchange` (`code` + allowlisted `redirect_uri`, or `{refresh_token}`)
4. `sdk.commands.authenticate({ access_token })`

Activity redirect: **`https://127.0.0.1`**. Browser: `http://localhost:5180/auth/callback` and `https://forza.events/auth/callback` (`oauthRedirect.ts`).

## Layout modes

`ACTIVITY_LAYOUT_MODE_UPDATE` → `DiscordLayoutProvider`. **0 focused** / **2 grid** = full app. **1 PIP** = centered logo only. We do **not** call `setOrientationLockState`. Logo-only is not inferred from viewport size.

## Networking (Activity proxy)

Served through `*.discordsays.com`.

| Requirement | Implementation |
|-------------|----------------|
| URL mapping | Prefix `/supabase` → `<project-ref>.supabase.co` (no `https://`, no `/.proxy/` in prefix) |
| Client rewrite | `patchUrlMappings` in `src/lib/discordUrlProxy.ts` |
| Dropped headers | `createSupabaseFetch(anonKey)` re-applies `apikey` and `Authorization` |
| Cover `<img>` | `coverDisplayUrl()` rewrites Storage URLs to `/supabase/...` (CSP blocks `*.supabase.co`) |
| Browse | Prefer **`browse-events`** over raw PostgREST |

Edge CORS: `APP_ORIGIN`, `*.discordsays.com`, `*.discord.com`, localhost ports, optional `ALLOWED_CORS_ORIGINS`. No matching `Origin` → no `Access-Control-Allow-Origin`.

Browser web on `forza.events` uses the Cloudflare Worker (`/supabase/*`, OG, sitemap) — [`DEVELOPMENT.md`](DEVELOPMENT.md#regional-access).

## Interactions Endpoint

```text
https://<project-ref>.supabase.co/functions/v1/interactions-endpoint
```

Verifies Ed25519 with `DISCORD_PUBLIC_KEY`. PING → `{ type: 1 }`. Buttons: `open_event:{uuid}` → type 12 + optional `launch_intents`; `open_app` → type 12 (no event); `view_results:{uuid}` → ephemeral standings; `join_event:{uuid}` → same roster path as Activity (gamertag modal if needed); receipt includes `leave_event:{uuid}`.

New publishes use **Components V2**. Pre-`040` messages stay classic embeds. No CORS — Discord server-to-server only.

## Publish target

| Step | API |
|------|-----|
| Servers (user ∩ bot, Manage Server / Administrator / owner) | `list-guilds` |
| Postable text + visible voice | `list-channels` |
| Validate | `validate-channel` |
| Post card | `publish-event` |

OAuth guild `permissions` can miss owner bits and 2FA-stripped Manage Server — recover via `owner` then bot member+roles; Discord 429 stays 429, not 403. Bot needs View Channel, Send Messages, Embed Links, **Create Invite** (channel invite + gathering-VC invite).

**Bot install:** `scope=bot`, **Requires OAuth2 Code Grant = OFF**. User-install alone is not a publish target.

## Operational checklist

[Developer Portal](https://discord.com/developers/applications):

1. Activities enabled — App Launcher + `LAUNCH_ACTIVITY`.
2. Activity URL Mapping — where the SPA loads (`https://forza.events` or Railway) plus `/supabase` → `<project-ref>.supabase.co`.
3. OAuth2 Redirects: `https://127.0.0.1`, `https://forza.events/auth/callback`, `http://localhost:5180/auth/callback`.
4. Interactions Endpoint URL (above).
5. Bot token in Supabase secrets; Code Grant off; **Server Members** intent (convoy leader / results guest search).
6. Install the bot in pilot guilds; channel permissions include **Create Invite**.

### Supabase / Railway / Worker

- `npm run sync:secrets`
- `supabase db push` (`001`–`043`)
- `npm run deploy:functions` (`--no-verify-jwt`)
- Railway `APP_ORIGIN=https://forza.events`; rebuild after env changes
- `npm run deploy:cf-worker` after Worker / Caddy cache changes (Caddy first)

### Legal URLs

| Field | URL |
|-------|-----|
| Terms of Service | `https://forza.events/terms` |
| Privacy Policy | `https://forza.events/privacy` |

These paths skip `DiscordOnlyGate`. Optional build-time: `VITE_LEGAL_CONTACT_EMAIL`, `VITE_LEGAL_OPERATOR_NAME`.

### Validate in Discord

[`E2E.md`](E2E.md) P0: infra, auth, deep link, publish target, embed sync, join. Minimum smoke: auth → browse → publish → card button → join/leave count on card → Rich Presence.

## Out of MVP

Threads, participant roles, always-on bot jobs — [`PLAN.md`](PLAN.md), [`BACKLOG.md`](BACKLOG.md).

## Links

[`PLAN.md`](PLAN.md) · [`PILOT_COMMUNITY.md`](PILOT_COMMUNITY.md) · [`STATUS.md`](STATUS.md) · [`DEVELOPMENT.md`](DEVELOPMENT.md) · [`E2E.md`](E2E.md) · [`AGENTS.md`](../AGENTS.md) · [Embedded App SDK](https://github.com/discord/embedded-app-sdk) · [Interactions](https://discord.com/developers/docs/interactions/overview)
