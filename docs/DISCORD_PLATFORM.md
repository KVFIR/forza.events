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

Before pilot launch, confirm:

- the Discord application has Activities enabled
- the deployed Activity URL is configured in the Developer Portal
- embedded auth works inside Discord
- publish flows can target the intended server and channel
- the embed button opens the correct Activity destination

## Links

- Discord Activity planning and MVP contract: [`PLAN.md`](PLAN.md)
- Current implementation state: [`STATUS.md`](STATUS.md)
- SDK package: [`@discord/embedded-app-sdk`](https://github.com/discord/embedded-app-sdk)
