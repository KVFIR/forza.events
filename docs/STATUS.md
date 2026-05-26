# Implementation status

Last updated: 2026-05-27

## Summary

The frozen MVP is **implemented in code** and wired to a **live Supabase project** (`uoysqfczahqmctbrrizn`). The Activity reads and writes real data when `.env` is configured. There is **no mock-data fallback**.

Remaining work is mostly **Discord portal validation in real guilds**, **Railway frontend redeploy after doc/code changes**, and **pilot feedback** — not greenfield implementation.

| Layer | State |
|-------|--------|
| React Activity (UI) | Done — Browse, Detail, Create (wizard), My Events, Profile, i18n (EN + RU) |
| Supabase schema | Done — migrations `001`–`021` |
| Edge Functions | Done — 14 functions (see below) |
| Security hardening | Done — storage, RLS scope, CORS, rate limits, publish validation |
| Local browser dev | Done — Discord OAuth + Supabase (not mock mode) |
| Sample content | Done — optional `sample-*` seed |
| Production infra | Done — Supabase + Railway (`forzaevents-production.up.railway.app`) |
| Production launch | Partial — Discord E2E in pilot guilds still open |

Product contract: [`PLAN.md`](PLAN.md). Discord setup: [`DISCORD_PLATFORM.md`](DISCORD_PLATFORM.md). Agent/runtime notes: [`AGENTS.md`](../AGENTS.md).

---

## What changed recently (May 2026)

### Security and API (2026-05-27)

- **Cover uploads:** client → `upload-cover` Edge Function (host-only); migration `018` revokes anon Storage writes on `event-covers`.
- **RLS:** migration `021` — scoped public reads on `users`, `event_participants`, `event_results` (non-draft events only).
- **CORS:** Edge Functions reflect allowlisted origins (`APP_ORIGIN`, `*.discordsays.com`, `*.discord.com`, localhost); no wildcard `*`.
- **Rate limits:** Postgres `check_api_rate_limit` + presets on browse, OAuth, and mutations.
- **Publish target:** server-side channel validation; guild member + Manage Server checks (`guildAccess.ts`, `publishTarget.ts`).
- **OAuth:** `token-exchange` allowlists `redirect_uri` (`oauthRedirect.ts`).
- **SPA:** CSP + `frame-ancestors` in `index.html` for Discord embed.

### Discord embed and participation

- Embed sync on join/leave, save, cancel, submit-results (`embedSync.ts`).
- Cancelled/completed/archived status reflected on Discord embed (title, color, button).
- Leave registration locked after event start; gamertag validated server-side.
- `launch_intents.guild_id` nullable for DMs (migration `019`).
- `users.events_joined` synced via trigger (migration `020`).

### Earlier (May 2026)

- Removed mock data; localhost uses live Supabase + OAuth.
- Browse via `browse-events` in Activity (proxy-safe headers via `createSupabaseFetch`).
- Create Event wizard under `src/screens/CreateEvent/` only.
- Default covers WebP + client compression before upload.
- i18n: `en` + `ru` (`src/i18n/`).

---

## Feature matrix

| Area | Status | Notes |
|------|--------|-------|
| Browse Events | Done | Edge `browse-events` in Activity; PostgREST on localhost |
| Event Detail | Done | Join/leave, host actions, results, live updates |
| Create Event | Done | 4 steps; cover via `upload-cover` |
| My Events | Done | Hosted/joined + host drafts merge |
| Profile | Done | Gamertag via `user-profile` |
| Discord Activity auth | Done | SDK → `token-exchange` → `authenticate` |
| Browser localhost auth | Done | `/auth/callback` + `sessionStorage` |
| Production browser tab | Done | `DiscordOnlyGate` — Activity-only |
| Supabase schema | Done | Through migration `021` |
| Edge Functions | Done | 14 deployed (`npm run deploy:functions`) |
| Realtime lobby | Done | `012`, `013` |
| FH6 cars catalog | Done | Autocomplete; no client inserts into `cars` |
| Cover storage | Done | Host-only upload; public read |
| Security (RLS/CORS/rate) | Done | `018`, `021`, `_shared/cors.ts`, `rateLimit*.ts` |
| Sample seed | Done | `npm run seed:events` or migration `014` |
| i18n | Done | EN default; RU toggle on profile |
| Bot process | Deferred | `bot/` notes only |

---

## Edge Functions (canonical list)

Deployed with `npm run deploy:functions` (`scripts/deploy-edge-functions.sh`), all with **`--no-verify-jwt`** and Discord token auth in function body:

| Function | Role |
|----------|------|
| `browse-events` | Public feed, single event, host drafts |
| `host-drafts` | Host draft list |
| `token-exchange` | OAuth code → access token |
| `list-guilds` | User guilds ∩ bot installed |
| `list-channels` | Postable text channels |
| `validate-channel` | Re-check channel before publish |
| `publish-event` | Post embed + set `open` |
| `save-event` | Draft save/update/delete/cancel |
| `event-participation` | Join/leave |
| `submit-results` | Final results + complete event |
| `user-profile` | Gamertag / profile fields |
| `launch-intent` | Embed button deep-link fallback |
| `upload-cover` | Host cover upload (service role) |
| `interactions-endpoint` | Discord Interactions (Ed25519); not CORS-facing |

---

## Frozen MVP alignment

Confirmed in code and schema:

- Publish requires server + channel; locked after publish (client + `assertTargetNotLocked`)
- Event types: `road`, `dirt`, `touge`, `drift`, `cruise`; track codes optional
- Car rules: `anything_goes` or `restricted_list`
- Published events editable only before start
- After start: submit results or cancel only
- Results immutable after submit; participants only in results payload
- Full events block joins (DB trigger + API)
- Production: Discord Activity only (no standalone web OAuth on Railway origin)

---

## Database migrations

Apply through **`021`** on the target project:

```bash
supabase link --project-ref uoysqfczahqmctbrrizn
supabase db push
```

If remote history diverges (timestamp versions vs `014`/`015`), use `supabase migration repair` — see [`DEVELOPMENT.md`](DEVELOPMENT.md).

| Migration | Purpose |
|-----------|---------|
| `001`–`008` | Core schema, cars, per-car setup |
| `009` | Frozen MVP: car_rule_mode, DNS, primary track |
| `010`–`011` | Track list, open-build notes |
| `012`–`013` | Realtime + replica identity |
| `014` | Sample events seed (dev) |
| `015` | Public read on `discord_guilds` |
| `016` | `cruise` event type enum |
| `017` | Sample cruise event type fix |
| `018` | Revoke anon Storage writes on covers |
| `019` | Nullable `launch_intents.guild_id` (DMs) |
| `020` | Sync `users.events_joined` on join/leave |
| `021` | Scoped RLS reads + API rate limit table/RPC |

---

## Infrastructure (verified 2026-05-27)

| Check | Result |
|-------|--------|
| Supabase project | `uoysqfczahqmctbrrizn` (FORZA.EVENTS) |
| Migrations | `001`–`021` on remote |
| Edge Functions | 14 deployed via `deploy:functions` |
| Activity hosting | Railway `https://forzaevents-production.up.railway.app` |
| Discord Activity OAuth | `https://127.0.0.1` redirect + `token-exchange` allowlist |

Set **`APP_ORIGIN`** on Railway to the deploy URL (embed cover URLs + Edge CORS). Redeploy frontend after changing env at build time.

---

## Remaining work before pilot sign-off

### Discord platform

- [ ] URL mapping: production origin + `/supabase` → `<ref>.supabase.co`
- [ ] OAuth redirects: `https://127.0.0.1` + localhost dev callback
- [ ] Interactions endpoint URL configured
- [ ] App installed in pilot guilds; publish channels verified

### End-to-end in Discord

- [ ] Auth → browse → detail → join/leave (embed updates)
- [ ] Create draft → upload cover → publish
- [ ] Embed button → correct event in Activity
- [ ] Submit results / cancel after start

### Pilot

- [ ] 3–5 real Forza Discord servers
- [ ] Hosts publish without manual workarounds
- [ ] Players discover via Activity, not only embed links

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| Empty Browse (Discord only) | Missing URL mapping or dropped `apikey` | `/supabase` mapping; `createSupabaseFetch`; deploy functions |
| CORS / preflight failed | Origin not allowlisted | Set `APP_ORIGIN`; add `ALLOWED_CORS_ORIGINS` if needed; redeploy functions |
| Cover upload 403 | Anon storage writes revoked | Use `upload-cover`; apply migration `018` |
| `invalid_grant` on Railway in browser | Activity OAuth ≠ web redirect | Use Discord Activity; localhost for dev |
| Production tab shows gate | By design | Open via App Launcher or embed |
| OAuth redirect fails | URI mismatch | Match `.env` and Discord portal |
| `Too many requests` | Rate limit | Wait 1 min; adjust limits only if needed |
| `seed:events` fails | No service role | `SUPABASE_SERVICE_ROLE_KEY` in `.env` |

---

## Deferred until after MVP

- Reminders, check-in, event threads
- Participant roles / role pings
- Always-on bot automation
- Dedicated Host Dashboard
- Standalone web app (separate Discord application)
- Tournament brackets, leaderboards, monetization
