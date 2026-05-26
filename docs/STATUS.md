# Implementation status

Last updated: 2026-05-26

## Summary

The frozen MVP is **implemented in code** and wired to a **live Supabase project**. The Activity reads and writes real data when `.env` is configured. There is **no mock-data fallback** anymore.

Remaining work is mostly **production deployment**, **Discord portal configuration**, and **pilot validation** in real servers.

| Layer | State |
|-------|--------|
| React Activity (UI) | Done — Browse, Detail, Create (wizard), My Events, Profile |
| Supabase schema | Done — migrations `001`–`015` |
| Edge Functions | Done — auth, save/publish, join/leave, results, guild/channel list |
| Local browser dev | Done — Discord OAuth + Supabase (not mock mode) |
| Sample content | Done — 10 `sample-*` events in DB (optional seed) |
| Production infra | Done — Supabase `uoysqfczahqmctbrrizn`, Railway deploy |
| Production launch | Partial — Discord portal + E2E + pilot still open |

Product contract: [`PLAN.md`](PLAN.md). Discord setup: [`DISCORD_PLATFORM.md`](DISCORD_PLATFORM.md).

---

## What changed recently (May 2026)

### Data and auth

- **Removed** `src/lib/mockData.ts` and all in-memory event/user fallbacks.
- **Localhost:** sign in with Discord via `/auth/callback` (`DISCORD_REDIRECT_URI=http://localhost:5180/auth/callback`).
- Session stored in `sessionStorage` until Sign out.
- **Inside Discord Activity:** unchanged Embedded App SDK flow (`authorize` → `token-exchange`).

### Browse feed fix

- Event list query uses explicit host embed: `users!events_host_discord_id_fkey`.
- RLS policy added for `discord_guilds` so guild names resolve on cards (`015_discord_guilds_public_read.sql`).

### Covers

- Default covers in `public/covers/*.webp` (optimized from large PNG/JPEG sources).
- `EventCover` component: lazy loading, Supabase image transforms for uploaded covers.
- Client-side resize/WebP before upload (`compressCoverForUpload`).
- Script: `npm run optimize:covers` (requires `sharp`).

### Create Event

- Monolithic `src/screens/CreateEvent.tsx` **removed**.
- Wizard lives under `src/screens/CreateEvent/` (`index.tsx`, steps, `useCreateEventForm`, validation).
- App lazy-imports `./screens/CreateEvent/index` explicitly.

### Sample events (dev/demo)

- Definition: `supabase/seed/sample-events.json`
- SQL migration: `014_seed_sample_events.sql` (idempotent: deletes `sample-%` then re-inserts)
- Script: `npm run seed:events` (needs `SUPABASE_SERVICE_ROLE_KEY`)

Host for samples: `FORZA.EVENTS` (`discord_id` `000000000000000001`). Visible on Browse for everyone; not “your” events until you sign in with your Discord account.

---

## Feature matrix

| Area | Status | Notes |
|------|--------|-------|
| Browse Events | Done | Global feed; requires valid `SUPABASE_ANON_KEY` |
| Event Detail | Done | Join/leave, car list, host actions, `EventCover` hero |
| Create Event | Done | 4 steps: Basics → Details → Target → Review |
| My Events | Done | Hosted/joined for signed-in user |
| Profile | Done | Stats + gamertag via `user-profile` |
| Discord Activity auth | Done | SDK + `token-exchange` |
| Browser localhost auth | Done | OAuth redirect + `AuthCallback` |
| Supabase schema | Done | Through migration `015` |
| Edge Functions | Done | See [`supabase/README.md`](../supabase/README.md) |
| Realtime lobby updates | Done | `012`, `013` |
| FH6 cars catalog | Done | ~618 cars; `searchCars()` + autocomplete |
| Cover storage | Done | `event-covers` bucket; client compression |
| Sample seed data | Done | Optional; for empty-project bootstrap |
| i18n | Deferred | UI copy is English only (i18n-ready structure not started) |
| Bot process | Deferred | `bot/` notes only |
| Production deploy | Done | https://forzaevents-production.up.railway.app (Railpack/Caddy) |

---

## Frozen MVP alignment (unchanged)

Confirmed in code and schema:

- Publish requires server + channel; locked after publish
- Primary track code required; extra codes optional
- Car rules: `anything_goes` or `restricted_list`
- Restricted mode requires ≥1 allowed car with per-car PI/restrictions
- Published events editable only before start
- After start: submit results or cancel only
- Results: position, DNF, DNS; immutable after submit
- Full events block new joins (no waitlist)

---

## Local development

### Prerequisites

1. Copy [`.env.example`](../.env.example) → `.env`
2. Fill from Discord Developer Portal + Supabase Dashboard → API:
   - `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_PUBLIC_KEY`, `DISCORD_BOT_TOKEN`
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY` (must match the project — invalid key → empty Browse)
3. Set `DISCORD_REDIRECT_URI=http://localhost:5180/auth/callback` and add the same URL under Discord → OAuth2 → Redirects

### Run

```bash
npm install
npm run dev          # http://localhost:5180 (port in vite.config.ts)
```

### Modes

| Context | Auth | Data |
|---------|------|------|
| Browser tab on localhost | **Sign in** button → Discord OAuth | Live Supabase |
| Discord Activity iframe | SDK authorize | Live Supabase |
| Missing/invalid Supabase keys | Sign in may work | Browse shows **no events** (empty list, not mocks) |

### Useful scripts

```bash
npm run typecheck
npm run build
npm run sync:secrets      # push DISCORD_* from .env to Supabase
npm run deploy:functions  # deploy all Edge Functions
npm run optimize:covers   # regenerate public/covers WebP assets
npm run seed:events       # re-seed sample-* events (SERVICE_ROLE_KEY required)
```

### Supabase local (optional)

Default workflow targets the **hosted** Supabase project linked via `supabase link`. For a fully local stack, point `SUPABASE_URL` at `http://127.0.0.1:54321` and run `supabase start` — not the primary documented path today.

---

## Repository layout (frontend)

```
src/
├── screens/
│   ├── BrowseEvents.tsx
│   ├── EventDetail.tsx
│   ├── EventResults.tsx
│   ├── MyEvents.tsx
│   ├── Profile.tsx
│   ├── AuthCallback.tsx          # localhost OAuth return
│   └── CreateEvent/               # wizard (do not add CreateEvent.tsx at parent level)
│       ├── index.tsx
│       ├── useCreateEventForm.ts
│       ├── validation.ts
│       └── steps/
├── components/
│   ├── EventCard.tsx
│   ├── EventCover.tsx            # optimized cover rendering
│   └── ...
├── context/
│   ├── AuthContext.tsx           # isConfigured, isSignedIn, signIn, signOut
│   └── JoinedEventsContext.tsx
└── lib/
    ├── discord.ts                # Activity SDK init
    ├── discordAuth.ts            # browser OAuth helpers
    ├── events.ts                 # Supabase reads + EVENT_LIST_SELECT
    ├── coverImage.ts             # upload compression + display URLs
    └── eventSpec.ts              # client validation rules
```

---

## Database migrations

Apply through `015` on the target project:

```bash
supabase link --project-ref <ref>
supabase db push
```

| Migration | Purpose |
|-----------|---------|
| `001`–`008` | Core schema, cars, per-car setup |
| `009` | Frozen MVP: car_rule_mode, DNS, primary track |
| `010`–`011` | Track list, open-build notes, drop stored car class |
| `012`–`013` | Realtime + replica identity for events |
| `014` | Sample events seed (dev) |
| `015` | Public read on `discord_guilds` |

---

## Infrastructure (verified 2026-05-26)

| Check | Result |
|-------|--------|
| Supabase project | `uoysqfczahqmctbrrizn` (FORZA.EVENTS) |
| Migrations | `001`–`013` + `seed_sample_events` + `discord_guilds_public_read` (≈ repo `014`/`015`) |
| Edge Functions | 10 deployed, `ACTIVE`: `token-exchange`, `list-guilds`, `list-channels`, `publish-event`, `interactions-endpoint`, `save-event`, `event-participation`, `submit-results`, `user-profile`, `launch-intent` |
| REST + anon key | `events` feed returns data (e.g. 10 `sample-*` rows) |
| Activity hosting | Railway `https://forzaevents-production.up.railway.app` — HTML/JS 200, `/auth/callback` 200 |
| Secrets | `.env` sets `APP_ORIGIN` + `DISCORD_REDIRECT_URI` to Railway origin; synced via `npm run sync:secrets` |

Custom domain `forza.events` is **not** resolving yet (DNS); production uses the Railway URL above.

---

## Remaining work before MVP launch

### Discord platform

- [ ] Activities URL mapping → production origin
- [ ] OAuth redirect URIs → production + localhost for dev
- [ ] Interactions endpoint → `interactions-endpoint` function URL
- [ ] Install app in pilot servers; verify publish channel permissions

### End-to-end validation

See checklist in [`PLAN.md`](PLAN.md#launch-checklist). Additionally:

- [x] Browse shows events with production anon key (REST verified 2026-05-26)
- [ ] Localhost Sign in → create draft → publish (or save sample edit flow)
- [ ] Cover upload produces WebP in Storage and displays on cards

### Pilot

- [ ] 3–5 real Forza Discord servers
- [ ] Hosts publish without manual channel workaround
- [ ] Players discover via Activity, not only embed links

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| Empty Browse, no errors in UI | Invalid `SUPABASE_ANON_KEY` | Copy anon key from Supabase Dashboard → API |
| Empty Browse inside Discord only | Missing Activity URL mapping for Supabase | Portal → URL Mappings: `/supabase` → `<ref>.supabase.co` (not `/.proxy/...`); redeploy app with `patchUrlMappings` |
| Empty Browse, console `fetchEventsWithRelations` | DB error / RLS | Check Supabase logs; ensure migrations applied |
| My Events empty, Browse works | Normal — list is only hosted/joined | Open **Browse** for the global feed |
| OAuth redirect fails | `DISCORD_REDIRECT_URI` mismatch | Match `.env` and Discord portal exactly |
| `invalid_grant` on production URL in browser | Activity app uses `127.0.0.1` OAuth, not web redirect | Open in Discord; localhost for dev; deferred: separate web Discord app |
| Production URL in browser tab | By design — Activity-only MVP | Shows `DiscordOnlyGate`; use Discord App Launcher |
| `seed:events` exits immediately | Missing `SUPABASE_SERVICE_ROLE_KEY` | Add to `.env` (never commit) |
| TypeScript errors on `CreateEvent.tsx` | Stale editor tab | Close unsaved `screens/CreateEvent.tsx`; use `CreateEvent/` folder only |
| Covers huge/slow | Old JPG assets | Run `npm run optimize:covers`, rebuild |

---

## Deferred until after MVP

- Reminders, check-in, event threads
- Participant roles / role pings
- Always-on bot automation
- Dedicated Host Dashboard screen
- Region/timezone preference editing
- i18n (non-English UI)
- Tournament brackets, leaderboards, monetization
