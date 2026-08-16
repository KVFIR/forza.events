# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Co-primary audiences (confirmed): **hosts** and **racers** in Forza Horizon Discord communities. Neither flow may degrade the other.

- **Hosts** create, publish, and manage events (roster, convoy leaders, results/cancel) for a Discord server + announcement channel.
- **Racers** discover published events, join or waitlist, show up with an Xbox gamertag, and follow results / ladder.
- **Situation:** primary use is inside Discord as an Activity (App Launcher or embed button). Secondary: guest browse on `forza.events` / localhost with soft Discord sign-in at intent (Join, Create, Profile, My Events).

## Product Purpose

FORZA.EVENTS helps Forza Horizon communities find and run clean races, cruises, and events without hunting through Discord channels.

Success means players discover and join through the Activity (and related embeds), not only via manual channel posts.

## Positioning

Activity-first Discord app with a **global public browse feed** across servers, plus a publish loop that posts a Discord embed and opens back into the Activity. A neighboring product that is only a website, only a bot, or only a single-server calendar could not truthfully claim this loop.

## Operating Context

- Discord Activity iframe (`@discord/embedded-app-sdk`): auth via Discord token exchange; guild context when launched from a server.
- Publish target = Discord server + text channel where the bot can post; optional gathering voice channel (editable until start; Join voice uses a `discord.gg` invite so non-members can join). After publish, server/channel/game are locked.
- In-game coordination uses **Convoy** seats (12 per convoy), convoy leaders (Xbox gamertag), and optional waitlist / multi-convoy.
- Games: Forza Horizon 5 and Forza Horizon 6; event types road, dirt, cruise.
- Browser guest showcase on `forza.events` (and localhost for engineering); raw Railway hostname stays Activity-gated.
- UI languages: English default, Russian toggle; notification locale follows the same.

## Capabilities and Constraints

**Shipped capabilities (durable product surface):** Browse, Event Detail (join/leave, host actions), Create wizard, My Events, Profile, Leaderboard / ranked ELO (allowlisted guilds), Discord DM notifications (transactional opt-out + Browse new-event opt-in), cover images, FH5/FH6 car catalogs, i18n EN+RU.

**Hard constraints future work must preserve:**

- Primary surface remains Discord Activity; Activity iframe blocks native `confirm`/`alert`/`prompt` (use in-app dialogs).
- Host permissions stay on `host_discord_id` — Discord Manage Server does not grant app-side edit rights.
- Publish requires guild + channel; draft may omit guild; after publish guild/channel/game (and ranked flag) stay locked. Optional gathering voice channel may change until start.
- Terminology: **Convoy** (not Group) for 12-seat slots; full capacity = **Event is full**; roster self-indication via border colors, not “You” labels.
- UI copy is English with i18n; game-native wording over generic SaaS phrasing.
- Mutations go through Supabase Edge + Discord token auth; anon PostgREST is read-scoped.

**Undecided / out of scope for this record:** native mobile apps; monetization; automatic in-game results import; full standalone web product (separate Discord application required).

## Brand Commitments

- Product name: **FORZA.EVENTS** (wordmark / title case as used in OG and app chrome).
- Voice: concise, Discord- and Forza-native; no “open in Discord” dead-ends on surfaces that only render inside Activity.
- Assets: `public/logo/logo.png` (+ webp / @2x), default event covers under `public/covers/`, site OG `public/og/site.webp`.
- Legal / site meta: community events for Forza Horizon as a Discord Activity (see `index.html` / Worker OG handlers).

## Evidence on Hand

- Live product: Discord Activity + `https://forza.events` guest showcase; production Supabase + Railway hosting.
- Brand assets: `public/logo/`, `public/covers/`, `public/og/site.webp`.
- Product contract docs: `docs/PLAN.md` (frozen MVP), `docs/STATUS.md`, `docs/E2E.md`, `AGENTS.md`.
- Do **not** fabricate testimonials, pilot community quotes, benchmarks, or pricing claims.

## Product Principles

1. **Stay in Discord** — design for Activity sandbox and Discord-native publish/join, not a generic website metaphor.
2. **Hosts and racers co-primary** — create/publish and browse/join must both remain clear and fast.
3. **Game-native language** — Convoy, Event is full, convoy leader; prefer Forza vocabulary over abstract product jargon.
4. **Trust boundaries stay server-enforced** — UI mirrors host locks, capacity, and publish rules; never imply permissions Discord or Edge do not grant.
5. **Truthful evidence only** — use real assets and shipped behavior; invent no social proof or metrics.
