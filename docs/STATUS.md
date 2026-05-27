# Implementation status

Last updated: 2026-05-27

## Summary

The frozen MVP is **implemented in code** and wired to a **live Supabase project** (`uoysqfczahqmctbrrizn`). The Activity reads and writes real data when `.env` is configured. There is **no mock-data fallback**.

Remaining work is mostly **Discord portal validation in real guilds**, **Railway frontend redeploy after changes**, and **pilot feedback** — not greenfield implementation.

| Layer | State |
|-------|--------|
| React Activity (UI) | Done — Browse, Detail, Create (wizard), My Events, Profile, i18n (EN + RU) |
| Supabase schema | Done — `001_baseline.sql` |
| Edge Functions | Done — 15 functions ([`supabase/README.md`](../supabase/README.md)) |
| Security hardening | Done — storage, RLS scope, CORS, rate limits, publish validation |
| Local browser dev | Done — Discord OAuth + Supabase (not mock mode) |
| Sample content | Done — optional `sample-*` seed |
| Production infra | Done — Supabase + Railway (`forzaevents-production.up.railway.app`) |
| Production launch | Partial — Discord E2E in pilot guilds still open |

Product contract: [`PLAN.md`](PLAN.md). Discord setup: [`DISCORD_PLATFORM.md`](DISCORD_PLATFORM.md). Agent/runtime notes: [`AGENTS.md`](../AGENTS.md).

---

## Feature matrix

| Area | Status | Notes |
|------|--------|-------|
| Browse Events | Done | Edge `browse-events` in Activity; PostgREST on localhost |
| Event Detail | Done | Join/leave, host actions, results, live updates |
| Create Event | Done | 4 steps; cover via `upload-cover`; convoy leader via `list-guild-members` |
| My Events | Done | Hosted/joined + host drafts merge |
| Profile | Done | Gamertag via `user-profile` |
| Discord Activity auth | Done | SDK → `token-exchange` → `authenticate` |
| Browser localhost auth | Done | `/auth/callback` + `sessionStorage` |
| Production browser tab | Done | `DiscordOnlyGate` — Activity-only |
| Supabase schema | Done | `001_baseline.sql` |
| Edge Functions | Done | `npm run deploy:functions` |
| Realtime lobby | Done | `events` + `event_participants` |
| FH6 cars catalog | Done | Autocomplete; no client inserts into `cars` |
| Cover storage | Done | Host-only upload; public read |
| Security (RLS/CORS/rate) | Done | In baseline schema + Edge shared modules |
| Sample seed | Done | `npm run seed:events` |
| i18n | Done | EN default; RU toggle on profile |
| Bot process | Deferred | [`bot/README.md`](../bot/README.md) |

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

## Database

```bash
supabase link --project-ref uoysqfczahqmctbrrizn
supabase db push
```

Schema: single migration `001_baseline.sql` — see [`supabase/README.md`](../supabase/README.md).

---

## Infrastructure

| Check | Result |
|-------|--------|
| Supabase project | `uoysqfczahqmctbrrizn` (FORZA.EVENTS) |
| Schema | `001_baseline` on remote |
| Edge Functions | 15 via `deploy:functions` |
| Activity hosting | Railway `https://forzaevents-production.up.railway.app` |
| Discord Activity OAuth | `https://127.0.0.1` + `token-exchange` allowlist |

Set **`APP_ORIGIN`** on Railway to the deploy URL (embed cover URLs + Edge CORS). Redeploy frontend after changing env at build time.

---

## Remaining work before pilot sign-off

Portal setup and Activity E2E validation: [`DISCORD_PLATFORM.md`](DISCORD_PLATFORM.md#operational-checklist). Local smoke tests: [`DEVELOPMENT.md`](DEVELOPMENT.md#testing-checklist).

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
| Cover upload 403 | Anon storage writes revoked | Use `upload-cover` Edge Function |
| `invalid_grant` on Railway in browser | Activity OAuth ≠ web redirect | Use Discord Activity; localhost for dev |
| Production tab shows gate | By design | Open via App Launcher or embed |
| OAuth redirect fails | URI mismatch | Match `.env` and Discord portal |
| `Too many requests` | Rate limit | Wait 1 min; adjust limits only if needed |
| `seed:events` fails | No service role | `SUPABASE_SERVICE_ROLE_KEY` in `.env` |

---

## Deferred until after MVP

See [`BACKLOG.md`](BACKLOG.md) and [`PLAN.md`](PLAN.md#what-is-explicitly-out-of-mvp).
