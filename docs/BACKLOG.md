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

**Goal:** hosts can mark an event as **ranked** so finishing positions (host-submitted, same as today) update a **driver skill rating** players see on Profile and event cards. Casual events stay unchanged.

**Not the same as:** `host_ratings` in `001_baseline.sql` — that table is **organizer feedback** (participants rate the host). Driver skill rating is a separate product surface (Profile already shows `rating` as TBD).

### Product rules (draft)

| Rule | Proposal |
|------|----------|
| Opt-in | Host enables **Ranked race** on Create (Review or Type step). Default off. Toggle **only** if event `guild_id` is on the ranked allowlist. |
| Rating pool | **Single global rating** per `discord_id` — one ladder across the product. |
| Who may host ranked | **Guild allowlist** (`rating_enabled_guilds` or env `RANKED_GUILD_ALLOWLIST`). Pilot servers first; expand by adding IDs. Casual events work on any server. |
| Event types | **Road** and **Dirt** only for v1; **Cruise** excluded. |
| When rating updates | Only after `submit-results` succeeds and event is `completed` (not cancelled). |
| Who is rated | **Anyone who joined** the event (`event_participants`) and has a valid result row — **any Discord server / guild**, not only allowlisted ones. Allowlist gates **hosting** ranked events, not **eligibility** to gain/lose global rating. **DNS** excluded. **DNF** counts as last among racers who started. |
| Minimum field | At least **4** rated drivers or skip rating update for that event. |
| Host | Host may race; rated like anyone else. |
| Immutability | Results final; rating computed once at submit (admin repair tool deferred). |
| Browse | **Ranked** filter/badge; **global leaderboard** screen (top N + user rank). Guild tab (item 2) can filter ranked events hosted on that server — not a separate rating pool. |

### Pairwise ELO vs OpenSkill

Both consume the same input: ordered finishers from host-submitted results (max ~12 players). Neither needs in-game telemetry.

| | **Pairwise ELO** | **OpenSkill** |
|---|------------------|---------------|
| **Model** | One number per player (e.g. 1000). Each race expands into many **1v1** comparisons from finish order; average the ELO deltas. | **μ** (skill) + **σ** (uncertainty) per player. One **multiplayer match** update from placements (TrueSkill family). |
| **FFA / 12-player race** | Works via pairwise reduction; not theoretically exact (rank cycles ignored). | Native: pass teams `[[id]]` + `ranks` `[1,2,…,n]`. |
| **New / returning players** | Default 1000 → large swings early unless you hand-tune K by `games_rated`. | High **σ** → conservative displayed rating (`μ − 3σ`) and controlled learning rate. |
| **Smurfs / sandbagging** | Easy to hold low ELO then spike. | Low μ + low σ still bumps fast; not cheat-proof without telemetry. |
| **Display** | One integer everyone understands. | Show **ordinal** (e.g. `round(μ − 3σ)` mapped to 0–10000) + optional “Placements: 12” count; hide σ in v1 tooltip. |
| **Implementation** | ~80 lines pure TS in `_shared/rating.ts`; trivial Vitest fixtures. | `@openskill/rating` in Edge (npm/esm) or vendored port; same test style with fixed seeds. |
| **Migration risk** | If we switch later, historical ELO ≠ OpenSkill — needs reset or backfill script. | Pick once for global ladder; avoid double migration. |
| **Compute per race** | O(n²) pairs, n≤12 → ≤66 updates (cheap). | O(n) team update (cheap). |

**Is OpenSkill worth the complexity?** For this product, **usually no** at launch.

- Field size is capped (~12), results are manual, and abuse is handled by **guild allowlist + rules**, not by a fancier prior.
- OpenSkill adds: npm/port in Deno Edge, μ/σ storage, display mapping (`μ − 3σ`), harder support (“why −38?”), and no fix for dishonest host-reported places.
- What OpenSkill buys (principled uncertainty, FFA-native update) matters more at **matchmaking scale** or with **variable huge fields** — not our MVP shape.
- **Pairwise ELO + K that shrinks with `games_rated`** gets most of the UX we need: one number, predictable deltas, trivial tests in `_shared/rating.ts`.

**Recommendation (global + guild allowlist):** ship **pairwise ELO** in phase A. Revisit **OpenSkill** only if we add automated matchmaking, team scoring, or see systematic complaints (wild swings for veterans, smurf spikes) that K-tuning cannot fix.

**Do not** ship per-guild rating pools. Optional later: per-guild **season points** only (cosmetic), same global ELO.

**New-player tuning (ELO):** e.g. `K_eff = K / sqrt(1 + games_rated)` with cap; display **Provisional** until `games_rated ≥ 5` (no separate σ column required).

### Trust & abuse (global ladder, allowlisted hosts)

- Ranked flag rejected at `save-event` / `publish-event` if `guild_id ∉ rating_enabled_guilds`.
- Same completion rules as before: min field size, participants-only results, skip if majority DNS.
- Optional later: require `restricted_list` + PI cap on ranked events; weekly delta cap per account.
- Deferred: disputes, telemetry, automated smurf detection.
- Rate-limit rating updates like other mutations.

### Data model (sketch)

```text
rating_enabled_guilds (guild_id primary key, enabled_at, note)

events.is_ranked         boolean default false
events.rating_applied    boolean default false

player_ratings (
  discord_id primary key,
  rating,                 -- display ELO, default 1000
  games_rated,
  updated_at
)

rating_ledger (
  event_id, discord_id,
  rating_before, rating_after, delta, created_at
)
```

- Compute in **`submit-results`** (or `waitUntil` immediately after RPC).
- `user-profile`: return `driverRating: { rating, gamesRated, provisional }` (replace skill stub; keep `hostRatingAvg` for organizer feedback later).
- If we migrate to OpenSkill later: new columns `mu`/`sigma` + one-time recalibration or season reset (document in migration).

### UX (English keys + RU)

- Create: **Ranked race** toggle only on allowlisted servers; copy “Counts toward **global** rating”.
- Event detail: **Ranked** badge.
- Profile + global leaderboard; optional “rank #128 / 2400 rated drivers”.
- After results: show per-player **Δ rating** on host results screen and in participant profile history.

### Implementation phases

| Phase | Deliverable |
|-------|-------------|
| **A** | `rating_enabled_guilds`, `is_ranked` validation, `player_ratings` + ledger, **pairwise ELO** on submit |
| **B** | Global leaderboard + Profile rating; browse **Ranked** filter |
| **C** | Tier bands from rating (Bronze→Champion); provisional badge while `games_rated < N` |
| **D** | Optional per-guild **season points** (cosmetic; same global ELO) |
| **E** | `host_ratings` UI (organizer reputation, separate from driver rating) |

### Open questions

- Should ranked require **Restricted car list** + PI cap for fairness, or trust host community rules?
- Convoy leader row: rated as participant if they have a result row (yes if in roster).
- Rematch farming: same 4 friends — need weekly delta cap or opponent diversity rule?
- Tie positions: MVP disallows duplicate positions today; if we add ties, split pairwise credit 0.5/0.5.

### Docs / code touchpoints (when implementing)

- `docs/PLAN.md` deferred list · `docs/E2E.md` ranked submit QA · `AGENTS.md` results + roles section  
- `submit-results` · `submit_event_results` RPC · `src/lib/eventSpec.ts` + `_shared/eventSpec.ts`  
- `save-event` / publish validation for ranked fields  
- i18n `en.json` / `ru.json`