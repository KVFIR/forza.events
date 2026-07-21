# FORZA.EVENTS — MVP Plan

> **Implementation state:** [`STATUS.md`](STATUS.md). **Post-MVP ideas:** [`BACKLOG.md`](BACKLOG.md).

## Frozen MVP spec (May 2026)

This section is the product contract for the MVP.
If any older note, prototype, or backlog item conflicts with this spec, the frozen spec wins.

- **Product surface:** FORZA.EVENTS is an Activity-first Discord app with a global public browse feed.
- **Visibility:** users can browse all published public events across all servers.
- **Create flow:** event creation includes choosing the target Discord server and target channel before publish. After publication, the event's server and channel cannot be changed.
- **Car rules:** each event must explicitly choose one mode: `Anything goes` or `Restricted car list`.
- **Anything goes mode:** no per-car list is required; **PI cap** and **additional car restrictions** are optional. When neither is set, car-rule surfaces (cards, detail, embed, update DMs) show nothing for open build.
- **Restricted mode:** at least one allowed car is required, with optional per-car restrictions.
- **Tuning restrictions:** optional template chips and custom text (shown on embed as extra rules).
- **Publish requirements:** title, **event type**, start time, host gamertag, cover image (or type default), target server, target channel, and a valid car rule mode are required. In `Restricted car list`, at least one car is mandatory.
- **Track code model:** track share codes are **optional** (ordered list when provided).
- **Event types:** `Road racing` (blue), `Dirt racing` (orange), `Cruise` (green).
- **Editing policy:** drafts are freely editable. Published events are editable only until the event starts.
- **Post-start policy:** after start, published field edits stay locked; host may still **reorganize groups** (balance / shuffle), **submit results**, and **cancel event** (permissions; not guild admins).
- **Organiser (display):** browse/cards show the target Discord **server name** when `guild_id` is set; otherwise the **host** display name. The creating user remains **host** for all organizer permissions (`host_discord_id`).
- **Discord sync:** published event embeds auto-sync all participant-facing fields, including cover image and description.
- **Capacity policy:** full events block new joins; waitlists are out of MVP.
- **Results model:** results support finishing positions, `DNF`, and `DNS`.
- **DNS handling:** `DNS` is set explicitly by the host during results submission.
- **Results immutability:** once results are submitted, they cannot be edited in MVP.
- **Deferred from MVP:** reminders, event threads, participant roles, and an always-on bot process.

## Strategic decision

**The MVP is a Discord Activity (Embedded App).**

Not a standalone website.
Not a bot-only UX.
The primary product surface is a full React app running inside Discord as an iframe.

The user stays in Discord:

1. Open FORZA.EVENTS from the App Launcher, or
2. Open a published event from the Discord embed button.

## MVP user journey

### Browse

- User opens the Activity inside Discord.
- User browses all published public events.
- User can open event details from the global feed.

### Join

- User opens an event.
- User joins or leaves the event.
- Full events reject new joins.
- Join requires a host-visible participant identity and gamertag where applicable.

### Create and publish

- Host creates a draft event.
- Host fills all required fields from the frozen spec.
- Host selects the target Discord server and target channel.
- Host publishes the event.
- The published embed includes an `Open in FORZA.EVENTS` path back into the Activity.

### Manage after publish

- Drafts remain fully editable.
- Published events are editable only before the start time.
- After start, the host can only cancel the event or submit results.

### Submit results

- Host submits positions.
- Host can mark `DNF` and `DNS`.
- Submitted results are final for MVP.

## What is explicitly out of MVP

> **Tracking:** post-MVP ideas and acceptance notes live in [`BACKLOG.md`](BACKLOG.md).

The following items are intentionally deferred and must not block launch:

- Reminders
- Check-in
- Event threads
- Participant roles and role pings
- Always-on bot scheduler
- Dedicated Host Dashboard screen
- Region/timezone preference editing
- Tournament brackets
- Automatic in-game results import
- Club/community pages
- Global leaderboards and **ranked events / driver skill rating** — Phase A+B shipped (`031`, pairwise ELO); see [`BACKLOG.md`](BACKLOG.md) §5 for remaining phases (tiers, season points, host ratings UI)
- Monetization / Discord IAP
- Native mobile app
- Livery / build database
- **Standalone browser web app** — separate Discord application (or OAuth client) with its own redirect URIs (`https://<web-host>/auth/callback`). The current app uses Activity OAuth (`https://127.0.0.1`) and blocks the production deploy URL in a normal browser tab (`shouldShowDiscordOnlyGate` in `src/lib/runtime.ts`). Localhost (`npm run dev`) remains available for engineering.

## Launch readiness

**Shipped in code:** frozen MVP spec above, Activity UI, migrations `001`–`006`, 15 Edge Functions, launch-intent / deep-link flow, production Supabase + Railway wiring.

**Done (platform):** Discord **application verification** in the Developer Portal (approved 2026-05-31).

**Still open:** manual Activity E2E in pilot guilds, pilot with real communities. Checklists: [`DISCORD_PLATFORM.md`](DISCORD_PLATFORM.md#operational-checklist), [`E2E.md`](E2E.md), [`STATUS.md`](STATUS.md#remaining-work-before-pilot-sign-off).

## Environment variables

See [`.env.example`](../.env.example) and [`DEVELOPMENT.md`](DEVELOPMENT.md#environment).

## Validation question

> **Do Forza players use the Discord Activity to discover and join events, or do they still fall back to manual channel posts?**
