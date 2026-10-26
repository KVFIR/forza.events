# Implementation status

Last updated: 2026-10-26

Feature development has stopped. This file records what shipped. The app remains live at **`https://forza.events`** (Discord Activity and guest site) on Supabase (`uoysqfczahqmctbrrizn`) and Railway. There is **no mock-data fallback**. Discord **application verification** was approved on 2026-05-31.

| Layer | State |
|-------|--------|
| React UI | Done — Browse, Detail, Create (Event → Publish), My Events, Profile, Ladder, i18n (EN + RU) |
| Schema | Done — migrations `001`–`043` ([`supabase/README.md`](../supabase/README.md)) |
| Edge Functions | Done — 23 via `npm run deploy:functions` |
| Security | Done — storage, RLS, CORS, rate limits, publish validation |
| Browser web | Done — guest showcase on `forza.events` / localhost; raw Railway hostname is Activity-only |
| Infra | Done — Railway SPA + Cloudflare Worker (Supabase proxy, OG, sitemap) |
| Production launch | Live — feature work stopped |

**Docs:** product [`PLAN.md`](PLAN.md) · Discord [`DISCORD_PLATFORM.md`](DISCORD_PLATFORM.md) · pilot server [`PILOT_COMMUNITY.md`](PILOT_COMMUNITY.md) · local [`DEVELOPMENT.md`](DEVELOPMENT.md) · QA [`E2E.md`](E2E.md) · agents [`AGENTS.md`](../AGENTS.md).

---

## Feature matrix

| Area | Notes |
|------|--------|
| Browse | Edge `browse-events`; UI default Upcoming; chip Completed; sort date/fill; Game / Type / Ranked filters |
| Event Detail | Join/leave/waitlist, host actions, reorganize convoys, results, realtime, optional Join voice |
| Create | Two steps; cover via `upload-cover`; convoy leader via `list-guild-members`; optional gathering VC |
| My Events | Hosted/joined + host drafts on top; cancelled hidden by default |
| Profile | Gamertag, DM prefs, driver rating |
| Ladder / ranked | Pairwise ELO (`031`–`034`); last race + Δ (`038`); Browse Ranked filter |
| Auth | Activity SDK → `token-exchange`; browser `localStorage` + refresh token |
| Cars | FH5 + FH6 catalogs; no client inserts; restricted list may repeat a car (`043`) |
| DMs | Outbox + `process-notifications`; transactional bell default on; Browse new-event alerts opt-in |
| Analytics | `client_events` + `track-event`; local `/analytics`; daily prune cron |
| Bot process | Deferred — [`bot/README.md`](../bot/README.md) |

---

## Product alignment

- Publish needs server + channel; locked after publish. Gathering voice is editable until start. Game and Ranked are locked after publish.
- Types: `road`, `dirt`, `cruise`. Car rules: `anything_goes` or `restricted_list`.
- Drafts freely editable. Published field edits until start. After start: reorganize convoys, submit results / mark finished, cancel.
- Full groups waitlist; host may add up to 5 convoys. Results: positions / DNF / DNS; immutable after submit; host may add guild guests (`035`).
- Surfaces: Activity primary; `forza.events` guest browse; Railway origin is not a standalone web app.

---

## Infrastructure

| Check | Result |
|-------|--------|
| Supabase | `uoysqfczahqmctbrrizn` |
| Migrations | `001`–`043` — `supabase db push` |
| Edge | 23 functions, `--no-verify-jwt` |
| SPA | Railway `https://forzaevents.up.railway.app` |
| Web | `https://forza.events` (Worker + Caddy) |
| Activity OAuth | `https://127.0.0.1` |
| Browser OAuth | `https://forza.events/auth/callback` |

Set **`APP_ORIGIN=https://forza.events`** on Railway (build) and Supabase. Redeploy frontend after changing build-time env.

---

## Left open when development stopped

Manual checks that were never closed. Notes, not a plan to resume.

| Note | Where |
|------|--------|
| Portal + proxy + bot install | [`DISCORD_PLATFORM.md`](DISCORD_PLATFORM.md#operational-checklist) |
| Local smoke | [`DEVELOPMENT.md`](DEVELOPMENT.md#testing-checklist) |
| Full Activity matrix | [`E2E.md`](E2E.md) |

The original pilot aim was a handful of Forza Discord servers publishing without workarounds.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| Empty Browse (Discord only) | Missing URL mapping or dropped `apikey` | `/supabase` mapping; `createSupabaseFetch`; deploy functions |
| CORS / preflight failed | Origin not allowlisted | Set `APP_ORIGIN`; optional `ALLOWED_CORS_ORIGINS`; redeploy functions |
| Cover upload 403 | Anon storage writes revoked | Use `upload-cover` |
| `invalid_grant` on Railway hostname | Activity OAuth ≠ that origin | Use Activity or `forza.events` / localhost |
| Production Railway tab shows gate | By design | App Launcher, embed, or `forza.events` |
| JS chunk 502 / HTML instead of JS | Worker forwarded `CDN-Loop`/`Host`, or Caddy SPA-fallback on `/assets` | `originHeaders.js`; Caddy `file_server` only for site files; hashed miss must 404 |
| Realtime fails on `forza.events` | Worker dropped the WebSocket upgrade | `requestForOrigin` (do not `new Request(clone, {headers})`) |
| OAuth redirect fails | URI mismatch | Match `.env`, portal Redirects, `oauthRedirect.ts` |
| `Too many requests` | Rate limit or Discord 429 | Wait; mutations 503, public reads stay up |
| `seed:events` fails | No service role | `SUPABASE_SERVICE_ROLE_KEY` |
| Publish stuck / 409 `PUBLISH_IN_PROGRESS` | Crashed mid-publish | Wait 5 min or clear `publish_started_at` |
| DMs not delivered | Cron / secret | `NOTIFICATION_CRON_SECRET` + GitHub Actions (or `scripts/invoke-process-notifications.sh`) |
| Analytics empty / 403 ingest | Missing `ANALYTICS_TRACK_SECRET` | `.env`, `npm run sync:secrets`, Railway build env |
| Guest Event Detail all **TBD** ELO | List payload / skipped Edge | `browse-events` `{event_id}` |

---

## Deferred

See [`BACKLOG.md`](BACKLOG.md) and [`PLAN.md`](PLAN.md#what-is-explicitly-out-of-mvp).
