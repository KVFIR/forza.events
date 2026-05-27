# Local development guide

English UI with optional Russian (`EN | RU` on Profile). This document describes how to run and test FORZA.EVENTS against a real Supabase backend.

See also: [`STATUS.md`](STATUS.md), [`PLAN.md`](PLAN.md), [`DISCORD_PLATFORM.md`](DISCORD_PLATFORM.md), [`.env.example`](../.env.example), [`AGENTS.md`](../AGENTS.md).

---

## Quick start

```bash
cp .env.example .env
# Fill DISCORD_* and SUPABASE_* (see below)
npm install
npm run dev
```

### CI checks (before push)

```bash
npm run typecheck
npm run test
npm run build
```

GitHub Actions runs the same on every push/PR to `main` / `master`.

Open http://localhost:5180 → **Sign in** (navbar) for create/join/profile → browse events.

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

Vite maps `DISCORD_CLIENT_ID`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY` at build time (see `vite.config.ts`).

### Localhost browser OAuth

| Variable | Value |
|----------|--------|
| `DISCORD_REDIRECT_URI` | `http://localhost:5180/auth/callback` |

Add the same URL under Discord → OAuth2 → Redirects.

`token-exchange` only accepts allowlisted `redirect_uri` values (`oauthRedirect.ts`):

- `DISCORD_REDIRECT_URI`
- `https://127.0.0.1` (Discord Activity)
- `http://localhost:5180/auth/callback`, `http://127.0.0.1:5180/auth/callback`
- Optional: `DISCORD_REDIRECT_URI_ALLOWLIST` (comma-separated, Supabase secret)

### Optional

| Variable | Use |
|----------|-----|
| `SUPABASE_SERVICE_ROLE_KEY` | `npm run seed:events`, `scripts/seed-cars.mjs` |
| `APP_ORIGIN` | Embed cover URLs; Edge Function CORS allowlist (no trailing slash) |
| `ALLOWED_CORS_ORIGINS` | Extra origins for Edge CORS (Supabase secret; comma-separated) |
| `VITE_API_BASE_URL` | Override Edge Functions base URL |
| `VITE_DEV_LOADING_DELAY_MS` | Artificial loading delay for UI testing |

### Railway (production Activity)

Set at **build time** (redeploy after changes):

```env
DISCORD_CLIENT_ID=...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
APP_ORIGIN=https://forzaevents-production.up.railway.app
```

Discord OAuth for Activity uses `https://127.0.0.1` — not the Railway origin. Production browser tabs show **Open in Discord** (`DiscordOnlyGate`).

```bash
railway variable set APP_ORIGIN=https://forzaevents-production.up.railway.app
```

---

## Database migrations

Target project: `uoysqfczahqmctbrrizn` (or your linked ref).

```bash
supabase link --project-ref <ref>
supabase db push
```

Apply through **`021`** (see [`supabase/README.md`](../supabase/README.md)). If `db push` reports remote-only migration versions, repair history then push — e.g. mark `014`–`016` applied and revert orphan timestamp versions before pushing `017`–`021`.

After schema changes that affect security (`018`, `021`), redeploy Edge Functions.

---

## Auth flows

### Browser (localhost)

1. **Sign in** → Discord OAuth
2. `/auth/callback` with `code`
3. `token-exchange` → access token + `users` row
4. `sessionStorage` until Sign out

Browse can use PostgREST directly (all non-draft events, including completed/cancelled). Join/create/publish use Edge Functions + Discord token.

### Discord Activity (iframe)

1. `initDiscordActivity()` → SDK `authorize` (`identify`, `guilds`)
2. `token-exchange` with `redirect_uri: https://127.0.0.1`
3. `authenticate(access_token)`
4. API calls use `createSupabaseFetch(anonKey)` so `apikey` / `Authorization` survive Discord’s proxy

---

## Edge Functions (local testing)

All 14 functions are invoked from `src/lib/api.ts` with:

- `apikey` + `Authorization: Bearer <anon>`
- `x-discord-access-token` when signed in

Deploy after changes:

```bash
npm run sync:secrets      # DISCORD_* → Supabase
npm run deploy:functions  # --no-verify-jwt on each
```

---

## Covers

Standard aspect ratio: **16:9** (1280×720 uploads). Client `compressCoverForUpload` center-crops then scales; bundled defaults are regenerated with `npm run optimize:covers` (same crop). UI uses `COVER_ASPECT_CLASS` on create preview and review; event detail hero uses `COVER_HERO_BAND_CLASS` + `COVER_PAGE_BLEED_CLASS` (full width — avoid `aspect-video` + `max-h` on bleed heroes).

| Asset | Location |
|-------|----------|
| Default covers | `public/covers/*.webp` |
| Custom uploads | `event-covers` bucket via **`upload-cover`** only |

Migration **`018_security_hardening.sql`** must be applied (revokes anonymous Storage writes).

Flow:

1. Save draft (`save-event`) → get `event_id`
2. `compressCoverForUpload` (client)
3. `uploadCoverImage(discordToken, guildId, eventId, file)` → Edge Function
4. Save again with `cover_image_url`

```bash
npm run optimize:covers   # regenerate bundled WebP
```

---

## Create Event wizard

Implementation: **`src/screens/CreateEvent/index.tsx`** only — do not add `CreateEvent.tsx` beside the folder.

Steps: Basics → Details → Target → Review  
Validation: `validation.ts`, `src/lib/eventSpec.ts`

---

## Commands

```bash
npm run dev              # port 5180
npm run typecheck
npm run build
npm run sync:secrets
npm run deploy:functions
npm run seed:events      # SERVICE_ROLE_KEY
npm run optimize:covers
```

---

## Testing checklist

### Local (browser)

- [ ] Browse lists events (seed or real data)
- [ ] Sign in → Sign out
- [ ] Create draft → My Events
- [ ] Upload cover → image on card/detail
- [ ] Join / leave (signed in, non-host event)

### Discord Activity

- [ ] Auth completes without console CORS errors
- [ ] Browse and event detail load
- [ ] Create → publish (bot in server, Manage Server, valid channel)
- [ ] Embed button opens correct event
- [ ] Join/leave updates embed participant count

### After deploy

- [ ] `supabase db push` current on project
- [ ] `npm run deploy:functions` succeeded
- [ ] Railway rebuild if `APP_ORIGIN` / client env changed

---

## Common issues

See [`STATUS.md`](STATUS.md#troubleshooting).
