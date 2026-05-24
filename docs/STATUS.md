# Implementation status

Last updated: 2026-05-25

## What is in the repo now

| Area | Status | Notes |
|------|--------|-------|
| Browse Events | Done | Published events, type filter, sort, Supabase when configured; mock fallback in browser |
| Event Detail | Done | Join/leave via Edge Function; gamertag gate; completed-event results view |
| Create Event | Done | Draft save, cover upload, per-car setup, channel publish |
| My Events | Done | Hosted/joined catalog for the current user |
| Profile | Done | Gamertag edit via `user-profile` function |
| Discord SDK auth | Done | `token-exchange` + authorize/authenticate flow |
| Supabase schema | Done | `supabase/migrations/001–007` |
| Edge Functions | Done | Auth, save/publish, join/leave, results, profile, launch intent |
| Cars autocomplete | Done | FH6 catalog + `searchCars()` |
| Deep link (embed button) | Done | `launch_intents` + `launch-intent` function |
| Deploy config | Partial | `vercel.json`; portal setup and production secrets are still manual |

## Local development

```bash
cp .env.example .env
npm run dev
```

Without `.env`, the app runs in **mock mode** (in-memory events, no API).

## Deploy checklist

1. Create Supabase project → `supabase db push` → deploy functions → set secrets.
2. Vercel: connect repo, set `VITE_*` env vars, deploy.
3. Discord Developer Portal: Activity URL, Interactions Endpoint, URL mappings, bot invite.
4. Test inside Discord with tunnel if needed (`cloudflared` / `ngrok`).

## Deferred (post-MVP)

Always-on bot, reminders/check-in, edit published embeds, Discord portal production rollout, i18n.
