# Pilot community server

Last updated: 2026-09-15

**Forza Racing Series** — support / pilot Discord for FORZA.EVENTS.

[`DISCORD_PLATFORM.md`](DISCORD_PLATFORM.md) · [`PLAN.md`](PLAN.md) · [`BACKLOG.md`](BACKLOG.md)

## Guild

| | |
|--|--|
| **Server** | Forza Racing Series |
| **`guild_id`** | `925000150638809178` |
| **Invite** | `https://discord.gg/hx4X9YdE46` — keep in sync with `discord_guilds.settings.invite_url` and `SUPPORT_GUILD_INVITE_URL` (`src/lib/discordInstall.ts`) |

Ranked allowlist: migration `032` seeds this id into `rating_enabled_guilds`.

Publish: host with **Manage Server**; bot needs View Channel, Send Messages, Embed Links, Create Invite in `#forza-events`. No auto role ping, reminders-as-bot, or event threads (Edge DMs still send). Optional `ping_role_id` on publish is backlog.

## Channels

| Category | Channels |
|----------|----------|
| INFO | `#welcome`, `#rules`, `#правила`, `#announcements`, `#объявления` |
| EVENTS | `#forza-events` (app card target), `#hall-of-fame` |
| COMMUNITY | `#general`, `#ru-chat`, `#gallery`, `#forza-news`, voice |
| ARCHIVE | `#fm-events`, `#fh5-events` — `@everyone` View denied |
| STAFF | `#backstage`, admin/mod |

## Roles

| Role | Assignment | Function |
|------|------------|----------|
| **EN** / **RU** | Onboarding Q1 | Language channels |
| **FH6 events** | Onboarding Q2 (optional) | Ping for race announcements |
| **Play with streamer** | Onboarding Q2 (optional) | Streamer-hosted races |
| **Crew** | Manual | `#backstage` event prep |
| **Host** | Manual | Publish in FORZA.EVENTS |
| Legacy FM/FH5/practice roles | Existing members | Not in onboarding |

`#forza-events` is visible to everyone; `FH6 events` does not gate the channel.

**Onboarding:** language (required) → optional event pings (multi-select). Default channels: `#welcome`, `#forza-events`, `#hall-of-fame`, `#gallery`, `#forza-news`, voice (+ `#general` if EN-default).

Rules §1–§2: Discord moderation and a possible FORZA.EVENTS platform ban (“may” until product enforcement exists).

## Event operations

Two weekly slots: **Road** (competitive), **Cruise** (community). App supports FH5 and FH6.

1. Publish in FORZA.EVENTS → card in `#forza-events`.
2. Discord Scheduled Event; time mirrored in `#announcements` / `#объявления`.
3. Pings: reply `@FH6 events` under the card (and `@Play with streamer` when relevant) until publish role ping ships. T-24h in announcements. No `@everyone`.
4. Post-race: results → `#hall-of-fame`; media → `#gallery`.

## Launch sequence

Foundation (onboarding + bot + `#forza-events` + publish→join E2E) → Seed (future events, Crew in `#backstage`) → Warm-up (closed races) → Reactivation (EN+RU announcement, legacy role ping) → Ritual (fixed weekly slots).

**Crew / `#backstage`:** tracks, car lists, PI, tunes, weekly templates — prep only, not public LFG.
