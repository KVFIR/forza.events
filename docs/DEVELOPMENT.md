# Local development guide

English only in the UI. This document describes how to run and test FORZA.EVENTS against a real Supabase backend on your machine.

See also: [`STATUS.md`](STATUS.md) (current state), [`PLAN.md`](PLAN.md) (MVP spec), [`.env.example`](../.env.example).

---

## Quick start

```bash
cp .env.example .env
# Fill DISCORD_* and SUPABASE_* (see below)
npm install
npm run dev
```

Open http://localhost:5180 → **Sign in** (navbar) → browse events.

---

## Environment

### Required

| Variable | Source |
|----------|--------|
| `DISCORD_CLIENT_ID` | Discord Developer Portal → Application ID |
| `DISCORD_CLIENT_SECRET` | OAuth2 → Client Secret |
| `DISCORD_PUBLIC_KEY` | General Information → Public Key |
| `DISCORD_BOT_TOKEN` | Bot → Token |
| `SUPABASE_URL` | Supabase → Project Settings → API |
| `SUPABASE_ANON_KEY` | Same page → `anon` / publishable key |

Vite injects `DISCORD_CLIENT_ID`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY` at build time from these names (no duplicate `VITE_*` in `.env` required).

### Required for localhost OAuth

| Variable | Value |
|----------|--------|
| `DISCORD_REDIRECT_URI` | `http://localhost:5180/auth/callback` |

Add the same URL in Discord → OAuth2 → Redirects.

`token-exchange` accepts `redirect_uri` from the client body; redeploy functions after pulling latest `discord.ts` shared helper changes.

### Optional

| Variable | Use |
|----------|-----|
| `SUPABASE_SERVICE_ROLE_KEY` | `npm run seed:events`, `scripts/seed-cars.mjs` |
| `APP_ORIGIN` | Production site origin (Railway URL without trailing slash). Used for embed cover URLs. |
| — | Bot install: disable **Requires OAuth2 Code Grant** under Discord → Bot (callback-less `scope=bot` from Activity). |
| `VITE_API_BASE_URL` | Override Edge Functions base URL |

### Railway (production Activity)

In the Railway service **Variables** tab, set at least (same names as `.env` — Vite reads them at **build** time):

```env
APP_ORIGIN=https://forzaevents-production.up.railway.app
```

In [Discord Developer Portal](https://discord.com/developers/applications) → **Bot**, disable **Requires OAuth2 Code Grant** (required for **Add to server** from the Activity).

OAuth2 → **Redirects** must include `https://127.0.0.1` (Activity user auth). Bot install does not use a redirect URL.

After adding or changing `APP_ORIGIN`, trigger a **new deploy** (Railway rebuilds the frontend bundle).

From your machine (after `railway login` and `railway link` in this repo):

```bash
railway variable set APP_ORIGIN=https://forzaevents-production.up.railway.app
```

---

## Auth flows

### Browser (localhost)

1. User clicks **Sign in** → Discord OAuth consent
2. Redirect to `/auth/callback` with `code`
3. `token-exchange` Edge Function → access token + user row
4. Token and user JSON stored in `sessionStorage`
5. **Sign out** clears session and resets UI

Without sign-in, Browse still loads **public** published events. Join, Create, and Profile mutations require sign-in.

### Discord Activity (iframe)

1. `initDiscordActivity()` runs Embedded App SDK `authorize`
2. Same `token-exchange` path; session saved for refresh
3. Guild context from SDK when available

---

## Sample events

For an empty database or demo browse feed:

```bash
# In .env:
# SUPABASE_SERVICE_ROLE_KEY=...

npm run seed:events
```

This removes and recreates events whose `slug` starts with `sample-`. Definitions live in [`supabase/seed/sample-events.json`](../supabase/seed/sample-events.json).

Alternatively apply migration `014_seed_sample_events.sql` via `supabase db push`.

---

## Covers

| Asset | Location |
|-------|----------|
| Default covers (WebP) | `public/covers/*.webp` |
| Uploaded covers | Supabase Storage bucket `event-covers` |

Regenerate bundled assets after replacing source images:

```bash
npm run optimize:covers
```

Uploads are resized client-side (max 1280×720, WebP when supported) before `uploadCoverImage`.

---

## Create Event wizard

Implementation path: **`src/screens/CreateEvent/index.tsx`**.

Do not recreate `src/screens/CreateEvent.tsx` beside the folder — TypeScript and Vite may resolve the wrong module.

Steps:

1. Basics — title, event type (required), time, cover, convoy leader  
2. Details — tracks (optional), car rules, PI / car list  
3. Target — Discord server + channel  
4. Review — summary + publish  

Validation: `src/screens/CreateEvent/validation.ts` and `src/lib/eventSpec.ts`.

---

## Commands

```bash
npm run dev              # dev server, port 5180
npm run typecheck        # tsc -b
npm run build            # production bundle
npm run sync:secrets     # .env → Supabase secrets
npm run deploy:functions # all Edge Functions
npm run seed:events      # sample events (service role)
npm run optimize:covers  # WebP defaults
```

---

## Testing checklist (local)

- [ ] Browse lists events (including `sample-*` if seeded)
- [ ] Open event detail — cover, cars, tracks render
- [ ] Sign in — navbar shows Sign out / LOCAL
- [ ] Join / leave updates participant state (after sign-in)
- [ ] Create draft → save → appears in My Events (host)
- [ ] Publish to a server where the bot is installed (needs real Discord + channel)

---

## Common issues

See the troubleshooting table in [`STATUS.md`](STATUS.md#troubleshooting).
