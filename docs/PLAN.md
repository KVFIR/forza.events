# FORZA.EVENTS — MVP Plan

> **Current implementation:** see [`STATUS.md`](STATUS.md) for what is built vs planned.

## Strategic decision

**The MVP is a Discord Activity (Embedded App).**

Not a standalone website. Not a bot-only UX. A full **React app inside Discord as an iframe** — in text channels, voice channels, or DMs, on desktop and mobile.

The user stays in Discord: App Launcher → FORZA.EVENTS → browse and create events inline.

The bot is a **companion**: DM reminders, roles, threads, channel embeds. The **primary UI is the Activity**.

---

## Why Activity, not bot-only

| Criterion | Bot (embed + buttons) | Activity (iframe) |
|---|---|---|
| UI | Discord components only | Full React UI |
| State | Stateless per interaction | SPA with client state |
| Lists / pagination | Embed limits | Filters, scroll, search |
| Create event form | Modal (max ~5 fields) | Full form + validation |
| Player profile | Static embed | Interactive card |
| Feel | Bot-like | App-like inside Discord |
| Launch | Slash / button | App Launcher or embed button |
| Distribution | Per-server install | User install → works broadly |

---

## Where it launches

Since September 2024, Activities are **not voice-only**:

- Text channel — App Launcher (button near chat input)
- DM — App Launcher
- Voice channel — bottom bar control
- Bot embed — `[Open in FORZA.EVENTS]` → `LAUNCH_ACTIVITY`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Discord Client                        │
│                                                             │
│  App Launcher → [FORZA.EVENTS]                              │
│       or                                                    │
│  Bot embed → [Open] → LAUNCH_ACTIVITY                       │
│                          ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         FORZA.EVENTS Activity (iframe)               │  │
│  │   React SPA + @discord/embedded-app-sdk              │  │
│  │   Screens: Browse, Detail, Create, Profile, Dashboard│  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                         │ Supabase JS / REST
                         ▼
              ┌──────────────────────┐
              │    Supabase          │
              │    PostgreSQL + RLS  │
              └──────────────────────┘
                         │
              ┌──────────────────────┐
              │   Discord Bot        │
              │   DM, roles, threads │
              │   embeds, scheduler  │
              └──────────────────────┘
```

---

## OAuth / Authentication flow

Discord Embedded Apps use a special flow (not a classic browser redirect):

```
1. Activity loads, SDK.ready()

2. sdk.commands.authorize({
     client_id, response_type: 'code', scope: ['identify', 'guilds']
   })
   → Discord OAuth modal

3. code → POST /api/auth/token { code } on your backend

4. Backend exchanges code for access_token (client_secret server-only)

5. Activity receives access_token

6. sdk.commands.authenticate({ access_token })

7. User authenticated; discord_id available
```

Token exchange: Supabase Edge Function or a small Express API.

---

## Tech stack

| Layer | Technology | Role |
|---|---|---|
| Activity UI | React 18 + Vite + TypeScript | SPA in iframe |
| Discord SDK | `@discord/embedded-app-sdk` | Client ↔ Discord |
| Styles | Tailwind CSS | Dark theme, neon accents |
| Routing | React Router | In-app screens |
| Database | Supabase (PostgreSQL) | Data + RLS |
| Auth | Discord OAuth via SDK | Identity |
| Token exchange | Supabase Edge Function | `code` → token |
| Bot | discord.js v14 + Node 20 | Background automation |
| Scheduler | node-cron (in bot) | Reminders, archive |
| Activity host | Vercel / Cloudflare Pages | HTTPS required |
| Bot host | Railway / Fly.io | Always-on |

---

## MVP — Activity screens

### Browse Events (home)

- Upcoming event cards
- Filters: type, region, car class, platform
- Join on card
- Pagination / infinite scroll

### Event Detail

- Full event info, participant list
- Join / Leave / Remind me
- Deep links to server thread and voice

### Create Event

- Full form: name, type, time, class, platform, region, max players, rules, voice required
- Client validation
- On success: bot posts embed to configured channel

### My Profile

- Avatar, username, Xbox gamertag
- Stats: joined, hosted, attendance, no-shows
- Edit preferences

### Host Dashboard

- Hosted events (active / past)
- Cancel, Open check-in, Submit results

---

## Bot responsibilities (companion)

| Task | Why not Activity |
|---|---|
| DM reminders | No DM access from Activity |
| Threads / channels | Needs Manage Channels |
| Participant roles | Needs Manage Roles |
| Channel embed on create | Bot writes to channel |
| Scheduled jobs | Activity has no background process |

Bot consumes Supabase (poll or webhook).

---

## Explicitly out of MVP

- Tournament brackets
- Automatic in-game results (no API)
- Club / community pages
- Global leaderboards
- Monetization / Discord IAP
- Native mobile app
- Livery / build database

---

## Milestones

Progress markers below reflect the current repository state, including the Activity client, Supabase schema, and deployed Edge Function surface.

### Milestone 1 — SDK + Auth (week 1)

- [ ] Discord Application registered, Activities enabled
- [x] Vite + React + `@discord/embedded-app-sdk` (local + standalone mock)
- [x] OAuth: authorize → token exchange → authenticate
- [ ] Supabase project linked and schema applied in the target environment
- [x] User upserted in `users` on login

### Milestone 2 — Browse + Join (week 2)

- [x] Browse Events UI with cards
- [~] Filters (type done; region/class/platform still pending if needed)
- [x] Event Detail UI
- [x] Browse reads real data from Supabase when configured
- [x] Join / Leave persisted in `event_participants`
- [x] Gamertag gate before join

### Milestone 3 — Create Event + channel publish (week 3)

- [x] Create Event flow implemented
- [x] Validation + persist event
- [x] Publish event to a Discord channel with `[Open in FORZA.EVENTS]`
- [ ] Event thread under embed

### Milestone 4 — Reminders + check-in (week 4)

- [ ] Remind me UI in Event Detail
- [ ] Always-on scheduler / DM reminders
- [ ] Check-in flow and status transitions
- [ ] No-show tracking automation

### Milestone 5 — Results + profile (week 5)

- [ ] Dedicated Host Dashboard screen
- [x] Submit results flow
- [x] Profile screen
- [x] Edit profile gamertag
- [ ] Region/timezone preference editing

### Milestone 6 — Pilot (week 6)

- [ ] Activity deployed on Vercel (HTTPS)
- [ ] Discord Developer Portal configured end-to-end
- [ ] 3–5 Forza Discord servers tested
- [ ] Discoverable in App Launcher
- [ ] Production validation for launch-intent and publish flows

---

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

### Bot

```env
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
WEB_BASE_URL=https://forza.events
```

See [`.env.example`](../.env.example) for a copy-paste template.

---

## Distribution and growth

1. Users install FORZA.EVENTS on their account (not only per server).
2. Rich Presence: *"KVFIR is using FORZA.EVENTS"*.
3. Friends click → try Activity → install.
4. After Developer Portal verification → App Directory discovery.

---

## Validation question (after Milestone 6)

> **Do Forza players use the Discord Activity to find and register for events — or do they return to manual channel posts?**
