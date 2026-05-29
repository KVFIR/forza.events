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