# Local development guide

English UI with optional Russian (`EN | RU` on Profile). This document describes how to run and test FORZA.EVENTS against a real Supabase backend.

See also: [`STATUS.md`](STATUS.md), [`PLAN.md`](PLAN.md), [`DISCORD_PLATFORM.md`](DISCORD_PLATFORM.md), [`E2E.md`](E2E.md), [`.env.example`](../.env.example), [`AGENTS.md`](../AGENTS.md).

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

Open http://localhost:5180 → tap the auth status pill in the **navbar** (or Profile) to **Sign in with Discord** before using the app (Browse, Event Detail, join/create/publish).

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

### Railway + forza.events (production)

Set at **build time** on Railway (redeploy after changes):

```env
DISCORD_CLIENT_ID=...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
APP_ORIGIN=https://forza.events
```

On **Supabase** secrets (via `npm run sync:secrets` or dashboard):

```env
APP_ORIGIN=https://forza.events
DISCORD_REDIRECT_URI=https://forza.events/auth/callback
```

Discord Developer Portal → OAuth2 → Redirects — add **both**:

- `https://127.0.0.1` (Activity iframe)
- `https://forza.events/auth/callback` (browser web)
- `https://www.forza.events/auth/callback` (if you serve `www`)

Activity OAuth still uses `https://127.0.0.1` — not `APP_ORIGIN`. Browser tabs on **forza.events** and **localhost** use Discord OAuth and require sign-in before the app (`BrowserSignInScreen` via `useBrowserSignInGate()`). The raw Railway hostname (`*.up.railway.app`) still shows **Open in Discord** unless you add it to `VITE_APP_ORIGIN` at build time.

```bash
railway variable set APP_ORIGIN=https://forza.events
```

#### Cloudflare DNS (forza.events)

1. Railway → service → **Settings** → **Networking** → **Custom Domain** → add `forza.events` (and optionally `www.forza.events`).
2. Cloudflare → DNS → **CNAME** `forza.events` → Railway target hostname (proxy **on** is fine).
3. SSL/TLS → **Full** (Railway terminates HTTPS on the custom domain).
4. Optional: redirect `www` → apex in Cloudflare **Redirect Rules**.
5. Discord Activities **URL Mapping** prefix stays pointed at the same Railway service (custom domain or `*.up.railway.app` — keep mapping in sync with where the Activity loads).
6. Update Developer Portal **Terms** / **Privacy** URLs to `https://forza.events/terms` and `/privacy`.

#### Regional access (e.g. Russia without VPN)

`*.supabase.co` is often blocked. Production browser web on **forza.events** routes API and Storage through the same origin (`https://forza.events/supabase/...`).

**Do not** reverse-proxy Supabase from Railway Caddy when forza.events is Cloudflare-proxied — Cloudflare returns **Error 1000 (dns_loop)**. Use the **Cloudflare Worker** in `cloudflare/worker.js` instead:

```bash
npx wrangler login
npm run deploy:cf-worker
```

The Worker routes `forza.events/supabase*` and `forza.events/event*` intercept before Railway. Redeploy after Supabase ref changes (`wrangler.toml` → `SUPABASE_ORIGIN`). Link previews on `/event/:id` need `npx wrangler secret put SUPABASE_ANON_KEY` on the Worker.

**Discord OAuth** (`discord.com`) may still be unreachable without VPN — the proxy fixes browse, profile, and covers after sign-in, not the login redirect itself.

---

## Database migrations

Target project: `uoysqfczahqmctbrrizn` (or your linked ref).

```bash
supabase link --project-ref <ref>
supabase db push
```

Apply all migrations with `supabase db push` (`001`–`006` — see [`supabase/README.md`](../supabase/README.md)). After applying, seed the cars catalog and optionally sample events.

After any schema change that affects security (RLS, storage policies), redeploy Edge Functions.

---

## Auth flows

### Browser (localhost + forza.events)

1. **Sign in** → Discord OAuth
2. `/auth/callback` with `code`
3. `token-exchange` → access token + `users` row
4. `sessionStorage` until Sign out

On **localhost**, Browse reads via PostgREST (`shouldUseDirectSupabaseReads`). On **forza.events** and in the Activity iframe, Browse uses the **`browse-events`** Edge Function. **My Events** / Profile use `include_completed` for past events. Join/create/publish always use Edge Functions + Discord token.

### Discord Activity (iframe)

1. `initDiscordActivity()` → SDK `authorize` (`identify`, `guilds`, `rpc.activities.write`)
2. `token-exchange` with `redirect_uri: https://127.0.0.1`
3. `authenticate(access_token)`
4. API calls use `createSupabaseFetch(anonKey)` so `apikey` / `Authorization` survive Discord’s proxy

---

## Edge Functions (local testing)

All functions from [`scripts/deploy-edge-functions.sh`](../scripts/deploy-edge-functions.sh) are invoked from `src/lib/api.ts` with:

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

Anonymous Storage writes on `event-covers` are revoked in the baseline schema — uploads go through the Edge Function only.

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

**Steps:** Event → Publish (two steps in `StepIndicator`).

**Persistence:** explicit **Save as draft** / **Save changes** only — no autosave, session WIP, or leave guard. Step 0 save navigates to My Events; Publish-step save stays on the wizard. Browser `?edit={id}` requires Discord sign-in before the form loads.

Validation: `validation.ts`, `src/lib/eventSpec.ts`

**Mobile layout:** On a narrow viewport (~320px), Create → Basics: the `datetime-local` field must not cause horizontal page scroll; event-type segment labels should stay readable in EN and RU (`SegmentGroup` grid + `index.css` WebKit picker rules).

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

Quick smoke before a PR or local iteration:

### Local (browser)

- [ ] Browse lists events (seed or real data)
- [ ] Sign in → Sign out
- [ ] Create draft (Event step → Save as draft) → My Events
- [ ] Create draft (Publish step → Save as draft) → stays on wizard; appears in My Events after refresh/navigate
- [ ] Open `/create?edit={draftId}` (signed in) → loads publish step
- [ ] Create Event (narrow ~320px): no horizontal scroll on date/time; event type segments readable (EN + RU)
- [ ] Upload cover → image on card/detail
- [ ] Join / leave (signed in, non-host event)

### After deploy

- [ ] `supabase db push` applied (`001`–`006`)
- [ ] `npm run deploy:functions` succeeded
- [ ] Railway rebuild if `APP_ORIGIN` / client env changed

### Discord Activity (pilot)

Full manual matrix (auth, embed deep links, publish target, embed sync, races, i18n): **[`E2E.md`](E2E.md)**.  
Portal prerequisites: [`DISCORD_PLATFORM.md`](DISCORD_PLATFORM.md#operational-checklist). **Application verification** in the Developer Portal is **approved** (2026-05-31); keep `/terms` and `/privacy` on `APP_ORIGIN` in sync with the portal.

---

## Common issues

See [`STATUS.md`](STATUS.md#troubleshooting).
