# Pilot community server

Last updated: 2026-08-16

Recorded setup for the **FORZA.EVENTS** support / pilot Discord server (**Forza Racing Series**).

**Related:** [`DISCORD_PLATFORM.md`](DISCORD_PLATFORM.md) · [`PLAN.md`](PLAN.md) · [`BACKLOG.md`](BACKLOG.md)

---

## Guild ID

| Server | `guild_id` |
|--------|------------|
| **Forza Racing Series** (pilot) | `925000150638809178` |

Public invite (DM-reachability CTA + Join server): `https://discord.gg/hx4X9YdE46` — keep in sync with `discord_guilds.settings.invite_url` and `SUPPORT_GUILD_INVITE_URL` in `src/lib/discordInstall.ts`.

Ranked allowlist: migration `032` inserts this id into `rating_enabled_guilds`.

---

## Product context

| Item | State |
|------|--------|
| Game | Forza Horizon 6 only |
| Event types in app | `road`, `dirt`, `cruise` |
| Race feed | `#forza-events` — FORZA.EVENTS bot embed target |
| Publish | Host with **Manage Server**; bot needs View Channel, Send Messages, Embed Links in target channel |
| MVP | No auto role ping on publish, no reminders, no event threads ([`PLAN.md`](PLAN.md), [`BACKLOG.md`](BACKLOG.md) §4) |
| Planned | Optional `ping_role_id` on publish — one role mention in message `content`, no re-ping on embed sync |

---

## Server channels

| Category | Channels |
|----------|----------|
| INFO | `#welcome`, `#rules`, `#правила`, `#announcements`, `#объявления` |
| EVENTS | `#forza-events`, `#hall-of-fame` |
| COMMUNITY | `#general`, `#ru-chat`, `#gallery`, `#forza-news`, voice |
| ARCHIVE | `#fm-events`, `#fh5-events` — `@everyone` View denied |
| STAFF | `#backstage`, admin/mod channels |

---

## Roles

| Role | Assignment | Function |
|------|------------|----------|
| **EN** | Onboarding Q1 | `#rules`, `#announcements`, `#general` |
| **RU** | Onboarding Q1 | `#правила`, `#объявления`, `#ru-chat` |
| **FH6 events** | Onboarding Q2 (optional) | Ping for all race announcements |
| **Play with streamer** | Onboarding Q2 (optional) | Ping for streamer-hosted races only |
| **Crew** | Manual | Event prep; access `#backstage` |
| **Host** | Manual | Publish in FORZA.EVENTS |
| **FM events, FH5 events, FM featured multiplayer, Ready for practice** | Legacy | Not in onboarding; kept for existing members |

Onboarding does **not** assign game roles (FH5/FM) or format roles (Competitive/Casual).

---

## Onboarding

**Default channels:** `#welcome`, `#forza-events`, `#hall-of-fame`, `#gallery`, `#forza-news`, voice (+ `#general` if EN-default).

| # | Question | Required | Outcome |
|---|----------|----------|---------|
| 1 | Language | Yes | EN or RU role + language channels |
| 2 | Event pings | No | `FH6 events` and/or `Play with streamer` (multiple allowed) |

`FH6 events` does not gate channels — `#forza-events` is visible to all.

---

## Rules (server copy)

Rules §1 (respect) and §2 (clean racing): enforcement may include Discord moderation **and** a **FORZA.EVENTS platform ban** (wording: “may” until product enforcement exists).

---

## Event operations

**Recurring schedule:** two weekly slots — **Road** (competitive), **Cruise** (community).

**Announcement flow:**

1. Publish in FORZA.EVENTS → embed in `#forza-events`.
2. Discord Scheduled Event per race; time mirrored in `#announcements` / `#объявления`.
3. Pings: `@FH6 events` on publish (manual reply under embed until publish role ping ships) and T-24h in announcements; streamer races also `@Play with streamer`. No `@everyone`.

**Post-race:** results → `#hall-of-fame`; media → `#gallery`.

**Until publish role ping ships:** after publish, reply under embed with `@FH6 events` (+ `@Play with streamer` for streamer races).

---

## Launch sequence

| Phase | Criteria |
|-------|----------|
| Foundation | Onboarding live; bot installed; `#forza-events` permissions; publish → join E2E verified |
| Seed | Future events published in app; Crew in `#backstage` |
| Warm-up | Closed races with core group completed |
| Reactivation | EN + RU announcement; one-time legacy role ping; `@FH6 events` CTA |
| Ritual | Fixed weekly slot days/times |

---

## Crew / backstage

| Item | Value |
|------|--------|
| Role name | **Crew** |
| Channel | `#backstage` |
| Scope | Tracks, car lists, PI, tunes, weekly templates — prep only, not public LFG |
