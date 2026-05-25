# FORZA.EVENTS — MVP Plan

> **Current implementation:** see [`STATUS.md`](STATUS.md) for what is already built and what is still needed to launch.

## Frozen MVP spec (May 2026)

This section is the product contract for the MVP.
If any older note, prototype, or backlog item conflicts with this spec, the frozen spec wins.

- **Product surface:** FORZA.EVENTS is an Activity-first Discord app with a global public browse feed.
- **Visibility:** users can browse all published public events across all servers.
- **Create flow:** event creation includes choosing the target Discord server and target channel before publish. After publication, the event's server and channel cannot be changed.
- **Car rules:** each event must explicitly choose one mode: `Anything goes` or `Restricted car list`.
- **Anything goes mode:** no per-car list is required; the event must still define a class and/or PI cap, and the UI should show an explicit `Anything goes` badge.
- **Restricted mode:** at least one allowed car is required, with optional per-car restrictions.
- **Publish requirements:** title, start time, host gamertag, cover image, target server, target channel, primary track code, and a valid car rule mode are required. In `Restricted car list`, at least one car is mandatory.
- **Track code model:** one primary track code is required; extra track codes are optional.
- **Editing policy:** drafts are freely editable. Published events are editable only until the event starts.
- **Post-start policy:** after start, the only organizer actions allowed are `submit results` and `cancel event`.
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
- After start, the organizer can only cancel the event or submit results.

### Submit results

- Host submits positions.
- Host can mark `DNF` and `DNS`.
- Submitted results are final for MVP.

## What is explicitly out of MVP

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
- Global leaderboards
- Monetization / Discord IAP
- Native mobile app
- Livery / build database

## Launch checklist

The MVP should be considered launch-ready only when all items below are complete.

### Product and code

- [x] Frozen MVP spec documented
- [x] Activity UI aligned with frozen MVP
- [x] Supabase schema aligned with frozen MVP
- [x] Edge Functions aligned with frozen MVP
- [x] Launch-intent / deep link flow implemented

### Infrastructure

- [ ] Supabase project linked and migrations applied through `008`
- [ ] Edge Functions deployed in the target environment
- [ ] Production secrets configured
- [ ] Vercel project connected and deployed

### Discord platform

- [ ] Discord Application configured for Activities
- [ ] Activity URL set to the deployed app
- [ ] Interactions endpoint configured if needed for publish flows
- [ ] Bot/app permissions verified for publish targets and guild listing
- [ ] Launch flow verified from embed back into the Activity

### End-to-end validation

- [ ] Sign in inside Discord Activity
- [ ] Browse published events from the global feed
- [ ] Create draft event
- [ ] Publish event to selected server/channel
- [ ] Open event from Discord embed
- [ ] Join event
- [ ] Leave event
- [ ] Edit published event before start
- [ ] Verify post-start edit lock
- [ ] Submit results with `position`, `DNF`, and `DNS`
- [ ] Verify results are immutable after submission
- [ ] Verify full event blocks new joins

### Pilot

- [ ] Test in 3–5 real Forza Discord servers
- [ ] Validate publish permissions and channel targeting in real communities
- [ ] Confirm people use the Activity instead of falling back to manual channel posts

## Environment variables

### Activity (repo root `.env`)

```env
VITE_DISCORD_CLIENT_ID=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE_URL=
```

### Backend / Edge Function

```env
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

### Discord publish integration

```env
DISCORD_BOT_TOKEN=
DISCORD_PUBLIC_KEY=
APP_ORIGIN=https://forza.events
```

See [`.env.example`](../.env.example) for the local app template.

## Validation question

> **Do Forza players use the Discord Activity to discover and join events, or do they still fall back to manual channel posts?**
