# FORZA.EVENTS

> **Find clean races, cruises and tournaments — without hunting through Discord channels.**

Community events for **Forza Horizon 6**, shipped as a **Discord Activity** (embedded React app). Players open it from the **App Launcher** or from a button on a published event embed.

---

## What it is

- **Discord Activity** — SPA in an iframe (`@discord/embedded-app-sdk`)
- **Supabase** — Postgres, RLS, Storage, Edge Functions
- **Discord bot token** — publish embeds, channel APIs, interactions (no always-on bot process in MVP)

Works in server channels, voice, DMs, and App Launcher (desktop and mobile).

---

## Current status

**Frozen MVP is implemented** and connected to production Supabase + Railway hosting.

| Done | Still open |
|------|------------|
| Browse, Detail, Create, My Events, Profile | Pilot validation in real Discord servers |
| Discord Activity auth + localhost dev OAuth | Optional custom domain DNS |
| Baseline schema + 15 Edge Functions | Post-MVP bot automation |
| Security: scoped RLS, CORS, rate limits, host-only covers | |
| i18n (English + Russian) | |

**Start here:** [`docs/STATUS.md`](docs/STATUS.md)

---

## Production vs local dev

| Context | Access |
|---------|--------|
| **Discord Activity** | Primary product — OAuth via `https://127.0.0.1` |
| **Production URL in a browser tab** | `DiscordOnlyGate` — open in Discord |
| **localhost:5180** | Full dev UI + optional browser Sign in |

---

## Repository structure

```
forza.events/
├── src/                 # React Activity (Vite)
├── supabase/
│   ├── migrations/      # 001_baseline.sql
│   └── functions/       # 15 Edge Functions
├── scripts/             # deploy, seed, optimize-covers
├── docs/
└── AGENTS.md            # Agent / implementation notes
```

---

## Tech stack

| Layer | Choice |
|-------|--------|
| UI | React 18, Vite, TypeScript, Tailwind |
| Discord | `@discord/embedded-app-sdk` |
| Backend | Supabase (Postgres, Edge Functions, Storage) |
| i18n | i18next (`en`, `ru`) |
| Hosting | Railway (Activity SPA) |

---

## Quick start (local)

```bash
cp .env.example .env
# Fill DISCORD_* and SUPABASE_* — see docs/DEVELOPMENT.md
npm install
npm run dev
```

Open http://localhost:5180 → **Sign in** for mutations; Browse works with anon key alone.

```bash
npm run deploy:functions   # after Edge Function changes
supabase db push           # after schema changes
```

---

## Documentation

| Doc | Contents |
|-----|----------|
| [`docs/STATUS.md`](docs/STATUS.md) | Feature matrix, infra, pilot gaps, troubleshooting |
| [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) | Env, auth, covers, testing checklist |
| [`docs/PLAN.md`](docs/PLAN.md) | Frozen MVP product contract |
| [`docs/DISCORD_PLATFORM.md`](docs/DISCORD_PLATFORM.md) | Portal checklist, proxy, OAuth |
| [`docs/ENGINEERING.md`](docs/ENGINEERING.md) | CI, tests, API error codes |
| [`docs/BACKLOG.md`](docs/BACKLOG.md) | Post-MVP features |
| [`supabase/README.md`](supabase/README.md) | Schema, Edge Functions, seeds |
| [`AGENTS.md`](AGENTS.md) | Runtime rules for coding agents |

---

## Brand

**Tagline:** *Race together. Not randomly.*  
Dark UI, neon accents, card-based layout.
