# FORZA.EVENTS — Feature backlog

Ideas that were not built. Feature development has stopped; this list is not a roadmap. Contract: [`PLAN.md`](PLAN.md). Shipped: [`STATUS.md`](STATUS.md).

Waitlists, convoy split, Edge DM cron (transactional + opt-in new-event + 2h reminders), ranked ELO + Ladder, and the `forza.events` guest showcase are **shipped** — not listed here.

---

## 1. Server-only visibility

Card in the chosen text channel; **omit from global Activity browse**. Field e.g. `visibility: global | guild_only`. Enforce on browse + Event Detail (guild membership via Discord token). Card still required.

---

## 2. Guild-scoped browse tab

Browse filter/tab for the current server (`sdk.guildId` or picker). Shows published events for that `guild_id` (including guild-only). Complements item 1.

---

## 3. Threads / roles / always-on bot

Companion bot (not Edge cron): auto event thread from publish, Discord roles on join/leave, optional role pings (`ping_role_id`). See [`bot/README.md`](../bot/README.md). 2h DMs and new-event alerts already ship via `process-notifications`.

---

## 4. Ranked — remaining

**Shipped:** pairwise ELO, allowlist, Profile, `/leaderboard`, Browse Ranked, results Δ, embed Ranked mark (`031`–`034`, `038`).

| Phase | Deliverable |
|-------|-------------|
| **C** | Tier bands (Bronze→Champion); richer provisional UX |
| **D** | Optional per-guild season points (cosmetic; same global ELO) |
| **E** | `host_ratings` UI (organizer reputation — not driver ELO) |

Still deferred: auto-split convoys by rating; whether ranked should require a restricted list + PI cap; rematch-farming caps.

`host_ratings` in `001_baseline.sql` is organizer feedback, not driver skill.
