# FORZA.EVENTS — product contract

Implementation: [`STATUS.md`](STATUS.md). Post-MVP: [`BACKLOG.md`](BACKLOG.md). Agent notes: [`AGENTS.md`](../AGENTS.md).

This is the live product contract. If an older note conflicts, this file plus [`STATUS.md`](STATUS.md) win.

## Surface

Activity-first Discord app with a **global public browse feed**. `https://forza.events` is a **guest showcase** (Browse, Event Detail, Ladder) with soft Discord sign-in at Join / Create / Profile / My Events. The raw Railway hostname is not a standalone web app (`DiscordOnlyGate`).

Users stay in Discord via:

1. App Launcher, or
2. A published event card button (`Open in FORZA.EVENTS` / `Join event`).

## Contract

- **Create / publish:** host picks Discord server + announcement channel before publish. After publication, server, channel, **game**, and **Ranked** cannot change. Gathering voice channel is optional and editable until start.
- **Required to publish:** title, event type, start time, host gamertag, cover (or type default), server, channel, valid car-rule mode. Restricted list needs ≥1 car (the same catalog car may appear more than once).
- **Car rules:** `Anything goes` (optional PI cap + extra restrictions; hide car-rule UI when both empty) or `Restricted car list` (optional per-car restrictions). Tuning templates are optional.
- **Tracks:** optional ordered share codes.
- **Types:** Road racing (blue), Dirt racing (orange), Cruise (green).
- **Games:** Forza Horizon 5 or 6 (Create default FH6). Browse filter; no game mark on cards.
- **Editing:** drafts freely editable. Published fields until start. After start: **reorganize convoys**, submit results / mark finished, cancel. Only `host_discord_id` has those permissions — not guild admins.
- **Organiser (display):** server name when `guild_id` is set, else host handle. Host permissions stay on `host_discord_id`.
- **Discord sync:** published cards auto-sync participant-facing fields (cover, description, roster, voice).
- **Capacity:** join fills the smallest open convoy (12 seats); else waitlist. Host may add convoys up to 5 (60 seats) when the lobby is full. Leave of an active seat promotes the earliest waitlisted racer into that convoy.
- **Results:** positions, `DNF`, `DNS` (host-set). Immutable after submit. Host may add guild members / waitlisted racers on submit. Cruises have no standings.
- **Ranked:** allowlisted guild + road/dirt; pairwise ELO per convoy after results. Locked after publish.
- **Out of this contract:** check-in, event threads, participant roles, always-on bot, dedicated Host Dashboard, tournament brackets, in-game results import, club pages, monetization, native mobile, livery DB.

## Journeys

**Browse** — open Activity or `forza.events` → public feed → Event Detail.

**Join** — open event → join / waitlist / leave (leave locks after start). Full convoys waitlist rather than hard-reject.

**Create** — draft → Event then Publish steps → server + channel → publish → V2 card in channel with Join / Open.

**Manage** — edit published until start (not guild/channel/game/ranked). After start: reorganize convoys, results, cancel.

## What is explicitly out

Must not block launch. Tracking: [`BACKLOG.md`](BACKLOG.md).

- Check-in
- Event threads, participant roles / role pings
- Always-on companion bot scheduler (DM cron is Edge, not this)
- Dedicated Host Dashboard screen
- Region/timezone preference editing
- Tournament brackets; automatic in-game results import
- Club/community pages
- Ranked **tiers / season points / host-ratings UI** (ELO + Ladder already shipped)
- Monetization / Discord IAP; native mobile; livery / build database
- **Standalone web product** as a separate Discord application. Guest showcase on `forza.events` is in; Railway origin stays Activity-gated.

## Launch readiness

Shipped: contract above, Activity UI, migrations `001`–`043`, 23 Edge Functions, launch-intent / deep-link, `forza.events` Worker, production Supabase + Railway.

**Done (platform):** Discord application verification (2026-05-31).

**Still open:** manual Activity E2E in pilot guilds. [`DISCORD_PLATFORM.md`](DISCORD_PLATFORM.md#operational-checklist), [`E2E.md`](E2E.md), [`STATUS.md`](STATUS.md#remaining-work-before-pilot-sign-off).

Env: [`.env.example`](../.env.example), [`DEVELOPMENT.md`](DEVELOPMENT.md#environment).

## Validation question

> **Do Forza players use the Discord Activity (or forza.events) to discover and join events, or do they still fall back to manual channel posts?**
