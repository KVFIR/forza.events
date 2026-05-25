# FORZA.EVENTS

> **Find clean races, cruises and tournaments — without hunting through Discord channels.**

A community event platform for **Forza Horizon 6**, built as a **Discord Activity (Embedded App)**.  
The app opens directly inside Discord — no browser, no separate window, no leaving the community.

---

## What it is

FORZA.EVENTS is a Discord Activity: a React web app that runs as an iframe inside Discord.  
Players find it in the **App Launcher** (the button next to the chat bar) or via a button on a bot embed.

Works in: text channels, voice channels, DMs, group DMs — on desktop and mobile.

**FORZA.EVENTS handles:** event discovery, registration, event publishing, profiles, and results inside Discord.  
**Discord handles:** voice, text, and community coordination — exactly as before.

---

## Current status

**Phase: frozen MVP implemented in code** — the remaining work is production deployment, Discord Activity configuration, and pilot validation in real servers.

| Done | Not yet |
|------|---------|
| Browse, Event Detail, Create, My Events, Profile screens | Production Discord portal setup |
| Tailwind dark UI, React Router, mock fallback | Production deploy and secrets |
| Discord SDK authorize/authenticate flow | Pilot launch and cross-server validation |
| Supabase schema, Edge Functions, event publish flow | Optional post-MVP automation |

See [`docs/STATUS.md`](docs/STATUS.md) for milestone progress and recommended next steps.

---

## MVP scope

See [`docs/PLAN.md`](docs/PLAN.md) for full detail, including the frozen MVP spec.

### Activity screens (inside Discord iframe)

| Screen | What it does |
|---|---|
| Browse Events | List of published public events from the global feed |
| Event Detail | Full info, participants, Join / Leave, host actions |
| Create Event | Full form including server/channel target and frozen car rules |
| My Profile | Stats and gamertag editing |
| My Events | Hosted and joined event catalog |

### Not part of the MVP

These ideas existed earlier in planning but are now explicitly deferred:

- DM reminders
- Check-in
- Event threads
- Participant roles and role pings
- Always-on bot scheduler
- Dedicated Host Dashboard screen

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
│   │   ├── discordAuth.ts # Browser OAuth for localhost
│   │   └── types.ts
│   └── main.tsx
├── bot/                  # Companion bot notes for post-MVP automation
├── supabase/             # Schema, Edge Functions, seeds — see supabase/README.md
├── docs/
│   ├── STATUS.md         # Current implementation state and launch work
│   ├── PLAN.md           # Frozen MVP spec and launch checklist
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

- [`docs/STATUS.md`](docs/STATUS.md) — current implementation state and launch work
- [`docs/PLAN.md`](docs/PLAN.md) — frozen MVP spec and launch checklist
- [`docs/DISCORD_PLATFORM.md`](docs/DISCORD_PLATFORM.md) — Discord Activity platform notes
- [`supabase/README.md`](supabase/README.md) — migrations, functions, secrets, and deployment notes

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
