# Discord Activity reference

Last updated: May 2026

## What matters for FORZA.EVENTS

- FORZA.EVENTS is a **Discord Activity**, not a bot-only product.
- A Discord Activity is a web app that runs inside Discord as an iframe.
- The client talks to Discord through `@discord/embedded-app-sdk`.
- The Activity is the primary product surface for the MVP.
- Server-side Discord automation is secondary and only supports flows the Activity cannot do directly.

## Where the Activity can launch

Discord Activities can launch from:

- Server text channels
- Voice channels
- DMs
- Group DMs
- The App Launcher

For FORZA.EVENTS, the two important entry paths are:

1. **App Launcher** — user opens the app directly inside Discord.
2. **Published event embed** — user clicks `Open in FORZA.EVENTS` and jumps into the Activity.

## Core auth flow

FORZA.EVENTS uses the embedded OAuth flow:

1. Activity loads and waits for `sdk.ready()`.
2. Client calls `authorize()`.
3. Discord returns an OAuth code.
4. Backend exchanges the code for an access token.
5. Client calls `authenticate(access_token)`.

This is why the app needs both:

- client-side `@discord/embedded-app-sdk`
- server-side token exchange

## MVP architecture implication

The MVP is **Activity-first**:

- browse events inside Discord
- open event details inside Discord
- create and publish events inside Discord
- join and manage events inside Discord

Backend functions and Discord-side publish flows support the Activity, but do not replace it.

## What is out of MVP

The following are explicitly not required for MVP launch:

- reminders
- threads
- participant roles
- scheduled automation
- always-on companion bot

## Operational checklist

Before pilot launch, confirm in the [Discord Developer Portal](https://discord.com/developers/applications):

1. **Activities enabled** — required for App Launcher and `LAUNCH_ACTIVITY`.
2. **Activity URL Mapping** — point to the deployed production origin (for example `https://forza.events`).
3. **Supabase proxy mapping** (required for Browse / API inside Discord) — add a second mapping so the Activity can reach your project through Discord’s proxy:

   | Prefix | Target |
   |--------|--------|
   | `/supabase` | `<project-ref>.supabase.co` (no `https://`) |

   Do **not** use `/.proxy/...` in the prefix — the Developer Portal rejects it ([changelog](https://discord.com/developers/change-log#remove-proxy-from-discord-activity-proxy-path)). The client keeps `https://<ref>.supabase.co`; `patchUrlMappings` rewrites requests to `{discordsays-origin}/supabase`. Discord’s proxy often drops `apikey` on PostgREST (`/rest/v1`), which causes `Invalid API key` — Browse and event detail in the Activity use the **`browse-events`** Edge Function instead (same path as `token-exchange`; deploy with `npm run deploy:functions`).
4. **Redirect URIs** (OAuth2 → Redirects) — register **every** URL your app uses:
   - `https://127.0.0.1` — embedded Activity (`token-exchange` with this `redirect_uri`)
   - `http://localhost:5180/auth/callback` — local `npm run dev` in a browser tab
   - `https://<your-production-host>/auth/callback` — e.g. Railway, if you open the SPA in a normal browser

   Browser sign-in always uses `{current origin}/auth/callback`. If that exact URL is missing in the portal, Discord returns `invalid oauth2 redirect_uri`.
5. **Interactions Endpoint URL** — required for this repo because published event embeds use a button that responds with `LAUNCH_ACTIVITY`:
   `https://<project-ref>.supabase.co/functions/v1/interactions-endpoint`
6. **Entry Point command** — verify the default Launch command opens the Activity from the App Launcher.
7. **App install in pilot guilds** — the app/bot must be installed in every server where hosts will publish; `list-guilds` only returns servers where both the user and bot are present.
8. **Channel permissions** — the bot must be able to send messages in the target publish channels.

Then validate inside Discord:

- embedded auth completes (`authorize` → token exchange → `authenticate`)
- browse/create/publish works against a real server/channel
- clicking `Open in FORZA.EVENTS` on a published embed launches the Activity on the correct event

## Links

- Discord Activity planning and MVP contract: [`PLAN.md`](PLAN.md)
- Current implementation state: [`STATUS.md`](STATUS.md)
- SDK package: [`@discord/embedded-app-sdk`](https://github.com/discord/embedded-app-sdk)
