# Implementation status

Last updated: 2026-05-25

## Current state

The repository is aligned with the frozen MVP spec from [`docs/PLAN.md`](PLAN.md).

The product is no longer in feature-discovery mode.
The remaining work is launch preparation: deployment, Discord configuration, and end-to-end validation in real servers.

## What is in the repo now

| Area | Status | Notes |
|------|--------|-------|
| Browse Events | Done | Global feed of published events; mock fallback in browser |
| Event Detail | Done | Car rules badge, primary/extra tracks, join/leave, host edit/cancel/results |
| Create Event | Done | 4-step flow: basics → tracks & cars → server/channel → review |
| My Events | Done | Hosted/joined catalog for the current user |
| Profile | Done | Gamertag edit via `user-profile` function |
| Discord SDK auth | Done | `token-exchange` + authorize/authenticate flow |
| Supabase schema | Done | `supabase/migrations/001–008` aligned with frozen MVP |
| Edge Functions | Done | Auth, save/publish, join/leave, results, `list-guilds`, embed sync on edit |
| Cars autocomplete | Done | FH6 catalog + `searchCars()` |
| Deep link / launch intent | Done | `launch_intents` + `launch-intent` function |
| Deploy config | Partial | `vercel.json` exists; production setup is still manual |

## Frozen MVP alignment

Confirmed in code and schema:

- Publish requires server + channel and locks them after publish
- One primary track code is required; extra track codes are optional
- Car rules support `Anything goes` or `Restricted car list`
- Restricted mode requires at least one allowed car
- Published events are editable only before start
- After start, host actions are limited to `submit results` and `cancel event`
- Results support `position`, `DNF`, and `DNS`
- Results cannot be resubmitted after save
- Full events block new joins

## Remaining work before MVP launch

### Infrastructure

- Create/link the target Supabase project
- Apply migrations through `008_frozen_mvp_spec.sql`
- Deploy all required Edge Functions
- Set production secrets and environment variables
- Deploy the Activity to Vercel

### Discord setup

- Configure the Discord Application for Activities
- Set the production Activity URL
- Verify publish permissions for selected servers/channels
- Verify the embed-to-Activity launch flow inside Discord

### Manual validation

- Authenticate inside Discord
- Browse published events
- Create and publish an event end to end
- Join and leave an event
- Edit a published event before start
- Confirm edit lock after start
- Submit immutable results with `DNF` and `DNS`
- Confirm full events reject new joins

### Pilot

- Test in 3–5 real Forza communities
- Validate that hosts can publish without friction
- Validate that players actually use the Activity workflow

## Local development

```bash
cp .env.example .env
npm run dev
```

Without `.env`, the app runs in **mock mode** with in-memory data.

## Deploy checklist

1. Create Supabase project.
2. Run `supabase db push` through migration `008`.
3. Deploy Edge Functions.
4. Set secrets and `VITE_*` env vars.
5. Configure Discord Developer Portal.
6. Test inside Discord with a tunnel if needed.

## Deferred until after MVP

These items are intentionally out of scope for launch:

- Reminders
- Check-in
- Event threads
- Participant roles / role pings
- Always-on bot automation
- Dedicated Host Dashboard screen
- Region/timezone preference editing
- i18n
