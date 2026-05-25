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

**Phase: frozen MVP implemented in code**, connected to Supabase. No mock-data fallback — localhost uses Discord OAuth and live DB reads.

| Done | Not yet |
|------|---------|
| Browse, Event Detail, Create wizard, My Events, Profile | Discord portal E2E + pilot (infra on Railway + Supabase) |
| Discord Activity + browser OAuth (`/auth/callback`) | Pilot in 3–5 real servers |
| Supabase migrations `001`–`015`, Edge Functions | Optional post-MVP bot automation |
| Cover WebP assets, lazy `EventCover`, sample event seeds | i18n |

See [`docs/STATUS.md`](docs/STATUS.md) for the full state matrix and [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) for local setup.

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
├── src/                  # Discord Activity — React SPA
│   ├── screens/          # Browse, Detail, CreateEvent/, Profile, AuthCallback
│   ├── components/       # EventCard, EventCover, Navbar, …
│   ├── context/          # AuthContext, JoinedEventsContext
│   ├── lib/              # discord, discordAuth, events, coverImage, …
│   └── main.tsx
├── scripts/              # seed-events, optimize-covers, deploy helpers
├── bot/                  # Companion bot notes (post-MVP)
├── supabase/             # Migrations, Edge Functions, seeds — supabase/README.md
├── docs/
│   ├── STATUS.md         # Current project state (start here)
│   ├── DEVELOPMENT.md    # Local dev + OAuth + troubleshooting
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

- [`docs/STATUS.md`](docs/STATUS.md) — **current project state** (features, migrations, gaps)
- [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) — local dev, OAuth, seeds, troubleshooting
- [`docs/PLAN.md`](docs/PLAN.md) — frozen MVP spec and launch checklist
- [`docs/DISCORD_PLATFORM.md`](docs/DISCORD_PLATFORM.md) — Discord Activity platform notes
- [`supabase/README.md`](supabase/README.md) — migrations, functions, secrets

---

## Scripts

```bash
npm install
npm run dev              # http://localhost:5180
npm run build
npm run typecheck
npm run sync:secrets     # push Discord secrets to Supabase
npm run deploy:functions
npm run seed:events      # sample browse data (needs SERVICE_ROLE_KEY)
npm run optimize:covers  # regenerate public/covers WebP
```

### Local browser

Requires `.env` with Supabase + Discord keys and `DISCORD_REDIRECT_URI=http://localhost:5180/auth/callback`. Use **Sign in** in the navbar — not mock mode.

See [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md).

---

## Environment variables

Copy `.env.example` to `.env`. See [`docs/PLAN.md`](docs/PLAN.md#environment-variables) for descriptions.

---

## Brand

**Tagline:** *Race together. Not randomly.*  
**UI:** Dark, neon accents (cyan + orange), fast CTAs, card-based layout. Feels like an app, not a Discord bot.
