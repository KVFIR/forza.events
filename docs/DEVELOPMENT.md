# Local development guide

English UI with optional Russian (`EN | RU` on Profile). Run against a real Supabase project — there is no mock mode.

See also: [`STATUS.md`](STATUS.md), [`PLAN.md`](PLAN.md), [`DISCORD_PLATFORM.md`](DISCORD_PLATFORM.md), [`E2E.md`](E2E.md), [`.env.example`](../.env.example), [`AGENTS.md`](../AGENTS.md).

---

## Quick start

```bash
cp .env.example .env
# Fill DISCORD_* and SUPABASE_*
npm install
npm run dev
```

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```

Open http://localhost:5180 — Browse / Event Detail / Ladder work as a guest. **Sign in with Discord** (navbar pill or soft-gate) for join / create / publish.

**Analytics (local only):** `ANALYTICS_DASHBOARD_SECRET` in `.env`, `npm run sync:secrets`, `supabase db push`, deploy functions → http://localhost:5180/analytics (no Discord sign-in). Brief tab classifies API errors. Prod ingest needs `ANALYTICS_TRACK_SECRET` on Railway build. Retention: `.github/workflows/prune-client-analytics.yml`.

---

## Environment

### Required

| Variable | Source |
|----------|--------|
| `DISCORD_CLIENT_ID` | Developer Portal → Application ID |
| `DISCORD_CLIENT_SECRET` | OAuth2 → Client Secret |
| `DISCORD_PUBLIC_KEY` | General Information → Public Key |
| `DISCORD_BOT_TOKEN` | Bot → Token |
| `SUPABASE_URL` | Project Settings → API |
| `SUPABASE_ANON_KEY` | Same page → `anon` key |

Vite inlines `DISCORD_CLIENT_ID`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY` at build time.

### Browser OAuth

| Variable | Value |
|----------|--------|
| `DISCORD_REDIRECT_URI` | `http://localhost:5180/auth/callback` (local) or `https://forza.events/auth/callback` (prod) |

Add the same URLs under Discord → OAuth2 → Redirects. `token-exchange` allowlists `DISCORD_REDIRECT_URI`, `https://127.0.0.1` (Activity), localhost callbacks, plus optional `DISCORD_REDIRECT_URI_ALLOWLIST`.

Silent re-auth: `POST token-exchange` `{refresh_token}` (no `redirect_uri`). Client stores refresh + expiry in **`localStorage`**. Discord `400 invalid_grant` clears the session; 429/5xx keep it (public reads continue as guest; mutations 503). Sessions saved before refresh-token support need one re-login.

### Optional

| Variable | Use |
|----------|-----|
| `SUPABASE_SERVICE_ROLE_KEY` | `seed:events`, `seed:cars` |
| `APP_ORIGIN` | Embed image URLs + Edge CORS (no trailing slash). Prod: `https://forza.events` |
| `ALLOWED_CORS_ORIGINS` | Extra Edge CORS origins |
| `VITE_API_BASE_URL` | Override Edge base URL |
| `VITE_DEV_LOADING_DELAY_MS` | Artificial loading delay |

### Production (`forza.events`)

Railway **build** env: `DISCORD_CLIENT_ID`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `APP_ORIGIN=https://forza.events`.

Supabase secrets (`npm run sync:secrets`):

```env
APP_ORIGIN=https://forza.events
DISCORD_REDIRECT_URI=https://forza.events/auth/callback
NOTIFICATION_CRON_SECRET=<random hex>
```

GitHub Actions (`.github/workflows/process-notifications.yml`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `NOTIFICATION_CRON_SECRET` (same value). Schedule is every **5 minutes**. Mutations also call `deferNotificationDelivery`.

Portal Redirects: `https://127.0.0.1` (Activity), `https://forza.events/auth/callback`, `http://localhost:5180/auth/callback`, and `www` if you serve it.

Activity OAuth stays on `https://127.0.0.1`. Raw `*.up.railway.app` shows **Open in Discord** unless that host is `VITE_APP_ORIGIN`.

#### Cloudflare DNS

1. Railway custom domain `forza.events` (optional `www`).
2. Cloudflare CNAME → Railway hostname, proxy **on**. SSL/TLS **Full**.
3. Optional: redirect `www` → apex.
4. Activity **URL Mapping** must match where the iframe loads (custom domain or Railway).
5. Portal Terms / Privacy: `https://forza.events/terms` and `/privacy`.

#### Regional access

`*.supabase.co` is often blocked. Browser web uses same-origin `https://forza.events/supabase/...`.

**Do not** reverse-proxy Supabase from Caddy while Cloudflare proxies the hostname (Error **1000 dns_loop**). Use the Worker:

```bash
npx wrangler login
npm run deploy:cf-worker
```

Routes: `forza.events/supabase*`, `forza.events/event*`, `forza.events/*`. After a Supabase ref change, update `wrangler.toml` `SUPABASE_ORIGIN`. Event OG needs `npx wrangler secret put SUPABASE_ANON_KEY`.

Worker origin fetches must strip `CDN-Loop` / `Host` / `cf-*` (`cloudflare/originHeaders.js`). WebSocket realtime: clone the upgrade Request — do not `new Request(clone, {headers})`. Caddy serves `/assets`, `/covers`, `/cars`, `/og`, `/logo` as `file_server` only (missing hashed JS → **404**, never SPA HTML).

**Discord OAuth** (`discord.com`) may still need a VPN — the proxy does not fix the login redirect.

---

## Database

```bash
supabase link --project-ref uoysqfczahqmctbrrizn
supabase db push
```

Migrations `001`–`043`: [`supabase/README.md`](../supabase/README.md). Then `npm run seed:cars` and optionally `npm run seed:events`. After RLS/storage changes, redeploy Edge Functions.

---

## Auth flows

### Browser (localhost + forza.events)

1. Sign in → Discord OAuth → `/auth/callback` → `token-exchange` → `users` row
2. Session in **`localStorage`** until Sign out

| Surface | Supabase path |
|---------|----------------|
| **localhost** | Vite `/supabase` → `*.supabase.co`. Browse may use PostgREST (`canUsePostgrestReads`). |
| **Activity iframe** | Discord mapping `/supabase` → project. Proxy **strips `apikey`** — `createSupabaseFetch` re-applies it. Prefer Edge `browse-events`. |
| **forza.events** | Worker `/supabase/*`. REST 401 only if `apikey` is missing. Public reads still prefer Edge. |

Join/create/publish always use Edge + `x-discord-access-token`. Compact finish/Δ and Event Detail retries: Edge `{event_ids}` / `{event_id}` first, PostgREST fallback. My Events / Profile pass `include_completed`.

### Discord Activity

1. `initDiscordActivity()` → `authorize` (`identify`, `guilds`, `rpc.activities.write`)
2. `token-exchange` with `redirect_uri: https://127.0.0.1`
3. `authenticate(access_token)`
4. `createSupabaseFetch(anonKey)` on every Edge/PostgREST call

---

## Edge Functions

Canonical list: [`scripts/deploy-edge-functions.sh`](../scripts/deploy-edge-functions.sh). Client `src/lib/api.ts` always sends `apikey` + `Authorization: Bearer <anon>` and `x-discord-access-token` when signed in.

```bash
npm run sync:secrets
npm run deploy:functions   # --no-verify-jwt on each
```

---

## Covers

**16:9** (1280×720). Client `compressCoverForUpload` center-crops then scales. Bundled defaults: `npm run optimize:covers`.

| Asset | Location |
|-------|----------|
| Default covers | `public/covers/*.webp` |
| Car thumbs | `public/cars/fh5/`, `fh6/`, `null.webp` (`npm run data:car-thumbs`) |
| Custom | `event-covers` via **`upload-cover` only** |

Flow: save draft → compress → `uploadCoverImage` → save again with `cover_image_url`.

---

## Create Event wizard

**`src/screens/CreateEvent/index.tsx` only** — do not add a sibling `CreateEvent.tsx`.

**Steps:** Event → Publish. Forward tab clicks run `tryContinue`; backward tabs skip validation.

**Persistence:** explicit Save only (no autosave / leave guard). **Save as draft** navigates to `/event/{slug}`. Browser `?edit={id}` requires sign-in; missing/foreign draft → My Events.

Validation: `src/lib/eventSpec.ts` ↔ `_shared/eventSpec.ts`.

**Mobile:** ~320px Create → Basics must not horizontal-scroll on `datetime-local` (`index.css` WebKit picker + `Input` overflow).

---

## Commands

```bash
npm run dev                 # port 5180
npm run typecheck && npm run lint && npm run test && npm run build
npm run sync:secrets
npm run deploy:functions
npm run deploy:cf-worker
npm run seed:events         # SERVICE_ROLE_KEY
npm run seed:cars
npm run optimize:covers
```

---

## Testing checklist

### Local (browser)

- [ ] Guest: Browse, Event Detail, Ladder without OAuth
- [ ] Sign in → Sign out; second tab stays signed in
- [ ] Create draft → Save as draft → Event Detail; appears in My Events
- [ ] `/create?edit={draftId}` (signed in) loads the wizard
- [ ] Narrow ~320px: no horizontal scroll on date/time; type segments readable (EN + RU)
- [ ] Upload cover → image on card/detail
- [ ] Join / leave (signed in, non-host)

### After deploy

- [ ] `supabase db push` (`001`–`043`)
- [ ] `npm run deploy:functions`
- [ ] Railway rebuild if client env / `Caddyfile` changed — hashed `/assets/*` 404 when missing
- [ ] `npm run deploy:cf-worker` if Worker / `originHeaders` / cache rules changed (**Caddy before Worker**)

### Discord Activity

Full matrix: [`E2E.md`](E2E.md). Portal: [`DISCORD_PLATFORM.md`](DISCORD_PLATFORM.md#operational-checklist).

---

## Common issues

See [`STATUS.md`](STATUS.md#troubleshooting).
