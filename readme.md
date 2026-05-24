# FORZA.EVENTS

> **Find clean races, cruises and tournaments — without hunting through Discord channels.**

A community event platform for **Forza Horizon 6**, built as a **Discord Activity (Embedded App)**.  
The app opens directly inside Discord — no browser, no separate window, no leaving the community.

---

## What it is

FORZA.EVENTS is a Discord Activity: a React web app that runs as an iframe inside Discord.  
Players find it in the **App Launcher** (the button next to the chat bar) or via a button on a bot embed.

Works in: text channels, voice channels, DMs, group DMs — on desktop and mobile.

**FORZA.EVENTS handles:** event discovery, registration, profiles, trust, history, reminders, results.  
**Discord handles:** voice, text, community — exactly as before.

---

## Current status

**Phase: MVP foundation implemented** — the Activity shell, Supabase schema, Edge Functions, and Discord auth flow are in place; production deployment and companion-bot automation are the main remaining steps.

| Done | Not yet |
|------|---------|
| Browse, Event Detail, Create, My Events, Profile screens | Dedicated Host Dashboard screen |
| Tailwind dark UI, React Router, mock fallback | Production Discord portal setup |
| Discord SDK authorize/authenticate flow | Always-on reminder / thread / role bot |
| Supabase schema, Edge Functions, event publish flow | Pilot launch and cross-server validation |

See [`docs/STATUS.md`](docs/STATUS.md) for milestone progress and recommended next steps.

---

## MVP scope

See [`docs/PLAN.md`](docs/PLAN.md) for full detail.

### Activity screens (inside Discord iframe)

| Screen | What it does |
|---|---|
| Browse Events | List of upcoming events, filters by type / region / class |
| Event Detail | Full info, participants, Join / Leave / Remind me |
| Create Event | Full form — name, type, time, class, platform, rules |
| My Profile | Stats: joined, hosted, attendance rate, gamertag |
| Host Dashboard | Manage own events, open check-in, submit results |

### Bot (companion, runs in background)

| Feature | Why bot, not Activity |
|---|---|
| DM reminders (1h / 10min before) | Activity has no access to user DMs |
| Auto-create event thread | Requires Manage Channels permission |
| Assign event role to participants | Requires Manage Roles permission |
| Post embed in channel when event is created | Bot writes on behalf of server |
| Scheduled tasks (check-in open, archive) | Activity doesn't run in background |

---

## How players access it

1. **App Launcher** — click the shapes button next to the chat bar → find FORZA.EVENTS → Launch
2. **Bot embed** — bot posts an event card in `#forza-events` → button `[Open in FORZA.EVENTS]` → Activity opens inline
3. **User-installed** — player installs the app on their account → appears in App Launcher everywhere, including servers where the bot isn't added

---

## Repository structure

```
forza.events/
├── src/                  # Discord Activity — React SPA (implemented)
│   ├── screens/          # BrowseEvents, EventDetail, CreateEvent, Profile
│   ├── components/       # EventCard, Navbar, filters, UI primitives
│   ├── context/          # JoinedEventsContext (session mock)
│   ├── lib/
│   │   ├── discord.ts    # Embedded App SDK + standalone mock mode
│   │   ├── mockData.ts   # Prototype events and user
│   │   └── types.ts
│   └── main.tsx
├── bot/                  # Companion automation plan — see bot/README.md
├── supabase/             # Schema, Edge Functions, seeds — see supabase/README.md + docs/SCHEMA.md
├── docs/
│   ├── STATUS.md         # What is built vs next steps
│   ├── PLAN.md           # MVP plan and milestones
│   ├── BOT_FLOWS.md
│   ├── SCHEMA.md
│   └── DISCORD_PLATFORM.md
└── readme.md
```

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Activity UI | React 18 + Vite + TypeScript | SPA required for iframe |
| Discord SDK | `@discord/embedded-app-sdk` v2.4.x | Official SDK for Activity ↔ Discord communication |
| Styles | Tailwind CSS | Dark theme, neon accents |
| Database | Supabase (PostgreSQL) | Auth, RLS, hosted |
| Token exchange | Supabase Edge Function | Discord `code → access_token` (client_secret on server only) |
| Bot | discord.js v14 + Node.js 20 | Background automation |
| Activity hosting | Vercel / Cloudflare Pages | HTTPS required for iframe |
| Bot hosting | Railway / Fly.io | Always-on process |

---

## Documentation

- [`docs/STATUS.md`](docs/STATUS.md) — implementation progress and recommended next steps
- [`docs/PLAN.md`](docs/PLAN.md) — MVP plan, architecture, auth flow, milestones
- [`docs/BOT_FLOWS.md`](docs/BOT_FLOWS.md) — bot automation: reminders, threads, roles, embeds
- [`docs/SCHEMA.md`](docs/SCHEMA.md) — database schema with full SQL migration
- [`docs/DISCORD_PLATFORM.md`](docs/DISCORD_PLATFORM.md) — Discord Activity platform notes

---

## Scripts

```bash
# Activity (web app)
npm install
npm run dev        # Vite — http://localhost:5180 (see vite.config.ts)
npm run build
```

### Local browser (UI prototype)

The Activity runs in **mock mode** when opened in a normal browser tab (`window.parent === window`). No Discord client or OAuth is required.

```bash
npm run dev
# Open http://localhost:5180
```

Optional: set `VITE_DISCORD_CLIENT_ID`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY` in `.env` when testing inside the Discord Activity iframe with the full auth and Edge Function flow.

```bash
# Bot (not scaffolded yet — see bot/README.md)
```

---

## Environment variables

Copy `.env.example` to `.env`. See [`docs/PLAN.md`](docs/PLAN.md#environment-variables) for descriptions.

---

## Brand

**Tagline:** *Race together. Not randomly.*  
**UI:** Dark, neon accents (cyan + orange), fast CTAs, card-based layout. Feels like an app, not a Discord bot.
