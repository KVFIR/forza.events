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
3. **Redirect URI** — add the OAuth redirect URI used by embedded Activity auth; set the same value as `DISCORD_REDIRECT_URI` in Supabase secrets.
4. **Interactions Endpoint URL** — required for this repo because published event embeds use a button that responds with `LAUNCH_ACTIVITY`:
   `https://<project-ref>.supabase.co/functions/v1/interactions-endpoint`
5. **Entry Point command** — verify the default Launch command opens the Activity from the App Launcher.
6. **App install in pilot guilds** — the app/bot must be installed in every server where hosts will publish; `list-guilds` only returns servers where both the user and bot are present.
7. **Channel permissions** — the bot must be able to send messages in the target publish channels.

Then validate inside Discord:

- embedded auth completes (`authorize` → token exchange → `authenticate`)
- browse/create/publish works against a real server/channel
- clicking `Open in FORZA.EVENTS` on a published embed launches the Activity on the correct event

## Links

- Discord Activity planning and MVP contract: [`PLAN.md`](PLAN.md)
- Current implementation state: [`STATUS.md`](STATUS.md)
- SDK package: [`@discord/embedded-app-sdk`](https://github.com/discord/embedded-app-sdk)
