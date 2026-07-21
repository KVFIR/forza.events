# FORZA.EVENTS — Feature backlog

Post-MVP planned work. MVP contract: [`PLAN.md`](PLAN.md). Shipped work: [`STATUS.md`](STATUS.md).

---

## 1. Server-only visibility

Embed in the chosen text channel; **omit from global Activity browse**. Field e.g. `visibility: global | guild_only`. Enforce on browse + event detail (guild membership via Discord token). Embed still required.

---

## 2. Guild-scoped browse tab

Browse filter/tab for the current server (`sdk.guildId` or picker). Shows published events for that `guild_id` (including guild-only). Complements item 1; no privacy change by itself.

---

## 3. Waitlist

When capacity is full, queue joins and promote on leave. Optional notify on slot open — may need bot (item 4).

## 4. Reminders / threads / roles

Batch with companion bot: pre-start reminders, auto event thread from publish, Discord roles on join/leave and optional pings. See [`bot/README.md`](../bot/README.md).

---

## 5. Ranked events & driver skill rating

**Status:** Phase **A+B shipped** (pairwise ELO, allowlist, Profile, `/leaderboard`, Browse Ranked). Phase C–E remain.

**Goal:** hosts can mark an event as **ranked** so finishing positions (host-submitted, same as today) update a **driver skill rating** players see on Profile and event cards. Casual events stay unchanged.

**Not the same as:** `host_ratings` in `001_baseline.sql` — that table is **organizer feedback** (participants rate the host). Driver skill rating is a separate product surface.

### Shipped (A+B)

- `rating_enabled_guilds`, `events.is_ranked` / `rating_applied`, `player_ratings`, `rating_ledger` (`031`)
- Create **Ranked race** toggle (allowlisted guild + road/dirt); multi-group ranked OK (ELO per group)
- Pairwise ELO on `submit-results` (DNS excluded; DNF last; min 4 **per group**)
- Allowlist seed: Forza Racing Series (`032`)
- Profile rating + provisional hint; `/leaderboard`; Browse Ranked filter; Ranked badge; results Δ; Discord embed Ranked field
- Deferred: auto-split groups by rating

### Remaining phases

| Phase | Deliverable |
|-------|-------------|
| **C** | Tier bands from rating (Bronze→Champion); richer provisional UX |
| **D** | Optional per-guild **season points** (cosmetic; same global ELO) |
| **E** | `host_ratings` UI (organizer reputation, separate from driver rating) |

### Open questions (deferred)

- Should ranked require **Restricted car list** + PI cap for fairness, or trust host community rules?
- Rematch farming: weekly delta cap or opponent diversity rule?

### Docs / code touchpoints

- `docs/E2E.md` ranked submit QA · `AGENTS.md` · `submit-results` · `leaderboard` Edge · `_shared/rating.ts`