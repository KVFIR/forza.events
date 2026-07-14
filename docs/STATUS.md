# Implementation status

Last updated: 2026-07-14

## Summary

The frozen MVP is **implemented in code** and wired to a **live Supabase project** (`uoysqfczahqmctbrrizn`). The Activity reads and writes real data when `.env` is configured. There is **no mock-data fallback**.

Remaining work is mostly **Activity E2E in pilot guilds**, **Railway frontend redeploy after changes**, and **pilot feedback** — not greenfield implementation. **Discord application verification** (Developer Portal) is **approved**.

| Layer | State |
|-------|--------|
| React Activity (UI) | Done — Browse, Detail, Create (wizard), My Events, Profile, i18n (EN + RU) |
| Supabase schema | Done — migrations `001`–`026` |
| Edge Functions | Done — 21 functions ([`supabase/README.md`](../supabase/README.md)) |
| Security hardening | Done — storage, RLS scope, CORS, rate limits, publish validation |
| Local browser dev | Done — Discord OAuth + Supabase (not mock mode) |
| Sample content | Done — optional `sample-*` seed |
| Production infra | Done — Supabase + Railway (`forzaevents.up.railway.app`) |
| Discord app verification | Done — Developer Portal approved (2026-05-31) |
| Production launch | Partial — Activity E2E in pilot guilds still open |

**Docs map:** product [`PLAN.md`](PLAN.md) · Discord setup [`DISCORD_PLATFORM.md`](DISCORD_PLATFORM.md) · pilot community server [`PILOT_COMMUNITY.md`](PILOT_COMMUNITY.md) · local dev [`DEVELOPMENT.md`](DEVELOPMENT.md) · manual QA [`E2E.md`](E2E.md) · agents [`AGENTS.md`](../AGENTS.md).

---

## Feature matrix

| Area | Status | Notes |
|------|--------|-------|
| Browse Events | Done | Activity: `browse-events`; localhost: PostgREST + same `isBrowseFeedEvent` filter |
| Event Detail | Done | Join/leave, host actions, results, live updates |
| Create Event | Done | 4 steps; cover via `upload-cover`; convoy leader via `list-guild-members` |
| My Events | Done | Hosted/joined + host drafts merge |
| Profile | Done | Gamertag + DM notification prefs (`user-profile`) |
| Discord Activity auth | Done | SDK → `token-exchange` → `authenticate` |
| Browser localhost auth | Done | `/auth/callback` + `sessionStorage` |
| Production browser tab (`forza.events`) | Done | Discord OAuth required (`BrowserAuthGate`); raw `*.up.railway.app` still Activity-only gate |
| Supabase schema | Done | `001_baseline` + `002`–`010` |
| Edge Functions | Done | `npm run deploy:functions` |
| Realtime lobby | Done | `events` + `event_participants` |
| FH6 cars catalog | Done | Autocomplete; no client inserts into `cars` |
| Cover storage | Done | Host-only upload; public read |
| Security (RLS/CORS/rate) | Done | Baseline + `003`/`004` migrations + Edge shared modules |
| Sample seed | Done | `npm run seed:events` |
| i18n | Done | EN default; RU toggle on profile; notification copy follows `notification_locale` |
| Discord DM notifications | Done | Outbox + `process-notifications` cron; Profile bell opt-out |
| Client analytics | Done | `client_events` + `track-event`; local `/analytics` dashboard; daily `prune-client-analytics` cron |
| Bot process | Deferred | [`bot/README.md`](../bot/README.md) |

---

## Frozen MVP alignment

Confirmed in code and schema:

- Publish requires server + channel; locked after publish (client + `assertTargetNotLocked`)
- Event types: `road`, `dirt`, `cruise`; track codes optional
- Car rules: `anything_goes` or `restricted_list`; optional tuning restriction templates
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

| Migration | Purpose |
|-----------|---------|
| `001_baseline.sql` | Full schema, RLS, realtime, storage |
| `002_event_tracks_jsonb.sql` | `events.tracks` jsonb |
| `003_security_publish_results.sql` | Publish lock, results RPC, scoped RLS |
| `004_rpc_submit_hardening.sql` | Hardened `submit_event_results` |

Details: [`supabase/README.md`](../supabase/README.md).

---

## Infrastructure

| Check | Result |
|-------|--------|
| Supabase project | `uoysqfczahqmctbrrizn` (FORZA.EVENTS) |
| Migrations | `001`–`026` on remote |
| Edge Functions | 21 via `deploy:functions` |
| Activity hosting | Railway `https://forzaevents.up.railway.app` |
| Discord application verification | Approved — legal URLs on deploy origin |
| Discord Activity OAuth | `https://127.0.0.1` + `token-exchange` allowlist |

Set **`APP_ORIGIN`** on Railway to the deploy URL (embed cover URLs + Edge CORS). Redeploy frontend after changing env at build time.

---

## Remaining work before pilot sign-off

| Task | Where |
|------|--------|
| Portal + proxy + bot install | [`DISCORD_PLATFORM.md`](DISCORD_PLATFORM.md#operational-checklist) |
| Local smoke | [`DEVELOPMENT.md`](DEVELOPMENT.md#testing-checklist) |
| Full Activity matrix | [`E2E.md`](E2E.md) |

### Pilot goals

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
| Publish stuck / 409 `PUBLISH_IN_PROGRESS` | Crashed mid-publish | Wait 5 min (lock TTL) or clear `publish_started_at` on draft row |
| Double Discord embed after publish | Old code / race before `003` | `db push` + redeploy `publish-event`; delete duplicate message manually |
| DMs not delivered | Cron not scheduled or missing `NOTIFICATION_CRON_SECRET` | Supabase secret + GitHub Actions secrets (see `.github/workflows/process-notifications.yml`) |
| Analytics empty / 403 ingest | Missing `ANALYTICS_TRACK_SECRET` on Railway build or Supabase | Set in `.env`, `npm run sync:secrets`, redeploy frontend; check `/analytics` ingest banner locally |
| `client_events` table missing | Migrations `021`–`026` not pushed | `supabase db push` |

---

## Deferred until after MVP

See [`BACKLOG.md`](BACKLOG.md) and [`PLAN.md`](PLAN.md#what-is-explicitly-out-of-mvp).
