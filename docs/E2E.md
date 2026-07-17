# Discord Activity E2E test plan

Manual QA matrix aligned with current code behavior (not an abstract checklist). Goal: catch pilot blockers before players hit dead ends.

**Related:** portal setup [`DISCORD_PLATFORM.md`](DISCORD_PLATFORM.md), local smoke [`DEVELOPMENT.md`](DEVELOPMENT.md#testing-checklist), troubleshooting [`STATUS.md`](STATUS.md#troubleshooting).

---

## How to run

**Minimum 4 Discord accounts:**

| Role | Purpose |
|------|---------|
| **Host A** | Manage Server on pilot guild; create and publish |
| **Player B** | Normal member; join/leave |
| **Player C** | Second client for 12th slot races and realtime |
| **Outsider D** | Not on server / no rights — negative cases |

**Minimum 2 guilds:**

1. **Pilot guild** — bot installed, announcement channel configured, **Server Members** intent on.
2. **No-bot guild** — bot absent → empty `list-guilds`, **Add to server** CTA.

**Activity entry points** (exercise each):

- App Launcher **on a server** (`sdk.guildId` → Target server prefill).
- App Launcher **without server** / personal context.
- Embed button `open_event:{uuid}` in channel.
- Re-open after failed auth (UI **Retry**).

**Discord layout modes:** at least smoke in **focused** and **PIP** (`ACTIVITY_LAYOUT_MODE_UPDATE`).

---

## 0. Infrastructure (before features)

| # | Check | Expected |
|---|--------|----------|
| 0.1 | Activity URL + `/supabase` → project | No CORS; Browse loads |
| 0.2 | Interactions Endpoint URL | Embed button works |
| 0.3 | OAuth redirect `https://127.0.0.1` | Auth without `invalid_grant` |
| 0.4 | Bot: Code Grant **OFF** | Install URL opens from Activity |
| 0.5 | Railway `APP_ORIGIN` | Cover images in embed + `<img>` via proxy |
| 0.6 | Edge Functions deployed with `--no-verify-jwt` | Invalid Discord token → app `401`; **not** gateway `UNAUTHORIZED_NO_AUTH_HEADER` |
| 0.7 | Hard refresh Activity after deploy | Old bundle does not mask fixes |
| 0.8 | `supabase db push` includes `017`–`019` + `npm run deploy:functions` (`process-notifications`) | DM outbox + claim RPC live; cron can deliver |
| 0.9 | GitHub Actions `process-notifications` workflow + repo secrets (or minute cron via `scripts/invoke-process-notifications.sh`) | 2h reminders + outbox drain |

---

## 1. Auth and session

### Happy path

- [ ] Cold start: authorize → `token-exchange` → `authenticate` → profile shows Discord name/avatar.
- [ ] Browse does **not** wait for auth (`usePublishedEvents` without token).
- [ ] My Events / Create / Join work after auth.
- [ ] Re-enter Activity in same session — `prompt: 'none'`, minimal prompts.

### Failure and recovery

- [ ] Failed exchange (bad secret / network) → guest + **Retry** (`AuthStatusIndicator`, Detail, Profile, Create).
- [ ] Retry succeeds → `isSignedIn`, drafts in My Events, join works.
- [ ] Expired Discord token → mapped API error, not empty UI.

### Guild context

- [ ] Launch **on server** → Create Target: server prefilled from `sdk.guildId`.
- [ ] Launch **outside server** → manual server pick; no “open in Discord” dead-end on in-Activity screens (dev-only when `token` is null).

---

## 2. Deep link: embed → Activity

| Scenario | Steps | Expected |
|----------|--------|----------|
| Embed button | Publish → click channel button | Activity opens **Event Detail** for that id |
| `custom_id` | Cold start + button | `launchEventId` from `open_event:` |
| Fallback | Old embed / missing custom_id | `launch-intent` by `guild_id` + discord_id |
| DM / null guild | Embed in DM (if used) | `launch_intents.guild_id` nullable; no crash |
| Other host’s event | Player B opens Host A link | Detail loads; join per rules |
| Draft / missing id | Link to deleted draft | Not found → Browse |
| Cancelled / completed | Button on final embed | Detail + banners; join closed |

---

## 3. Browse (public feed)

### Load and filters

- [ ] Browse feed = upcoming published events with registration open (`isBrowseFeedEvent`: not draft, not live/started, not completed/cancelled/archived).
- [ ] Type filter: `road`, `dirt`, `cruise` + **All**.
- [ ] Sort: event date / created / fill.
- [ ] Empty filter → “no match” + clear filters.
- [ ] Cards: type, date, organiser (`guildName` or host), fill, cover via **proxy URL**.

### Realtime (two clients)

- [ ] B join/leave → A’s Browse count updates without refresh.
- [ ] Host publishes → A sees new event (INSERT/refetch).
- [ ] Cancelled/completed → removed from browse feed.

### Errors

- [ ] Broken proxy → `browse.errorDiscord*` mentions `/supabase`.
- [ ] **Try again** (`onRetry` / refetch) after error; refresh indicator on silent refetch.

---

## 4. Event Detail — participant

### Join / leave

| Condition | Expected |
|-----------|----------|
| No gamertag in profile | `GamertagModal` → join |
| Gamertag in profile | Join without modal (or confirm) |
| Successful join | Leave button; count up; Discord embed updated |
| Leave before start | Slot freed; embed updated |
| **After `starts_at`** | Leave disabled; “Registered” / closed |
| **All groups full** | Button shows **Join waitlist**; 13th joins waitlist (`waitlisted`), not `EVENT_FULL` |
| **Host** | No Join; Edit / post-start actions only |
| **Convoy leader** (host-assigned) | Leader UI; **cannot leave** (`LEADER_CANNOT_LEAVE`) |
| Join updates profile | `xbox_gamertag` written to `users` |

### Waitlist & groups

| Condition | Expected |
|-----------|----------|
| Full group 1, then join | Row goes to **Waitlist** section; button = **Leave waitlist** |
| Group 1 has open seats but group 2 is smaller | Next **Join** lands in the **smallest** open group (tie-break lower group number) |
| Active racer leaves before start | Earliest waitlisted racer auto-promoted into freed group; count steady |
| Host, every active group full (12/24/36…) | **Add group N** button; picker lists waitlist (if any), active non-leaders from other groups, host (if not already a convoy leader), plus guild search |
| 12/12, waitlist empty, host adds group 2 (guild pick leader) | `group_count = 2`; new group has leader only; group 1 still full; next **Join** lands in **group 2**; embed shows second group field |
| Add group confirmed | `group_count++`; leader + oldest queued racers fill the new group (leader-only when waitlist empty); vacated seat in the source group backfills from waitlist; embed gains a per-group field |
| `group_count = 5` | Add group hidden (`GROUPS_MAXED` if forced); total capacity 60 |
| Open seat in any active group | Add group hidden (`LOBBY_NOT_FULL` if forced) |

### Change convoy leader (published, host)

| Condition | Expected |
|-----------|----------|
| Host, before `starts_at` | **Change leader** in each group header (`n/12` row); not in published **Edit** |
| Single group | Same **Change leader** control (no “Group 1” label required) |
| Pick another driver in the same full group | Swap leader ↔ driver; roster count unchanged |
| Full group, `self_join` leader | Waitlist / guild outsiders hidden; guild search disabled; only in-group drivers in quick-pick |
| Full group, `host_assigned` leader removed | Free seat → waitlist or guild pick allowed; embed + `convoy_leader_changed` DMs to group racers |
| New leader assigned | Leader gets **convoy leader assigned** DM (transactional); racers get **convoy leader changed** |
| Same leader picked again | `unchanged: true`; no DMs, no embed churn |
| After `starts_at` | **Change leader** hidden; API `REGISTRATION_AFTER_START` |

### Balance groups (published, host, `group_count` ≥ 2)

| Condition | Expected |
|-----------|----------|
| Host, before `starts_at`, 2+ groups, roster action available | **Reorganize groups** opens a confirmation modal; warns that moved racers get a Discord DM |
| Uneven sizes + 2+ drivers | Modal offers **Balance groups** and **Shuffle** |
| Even sizes, 2+ drivers | Modal offers **Shuffle** only with confirm button |
| Balance / shuffle confirmed | Leaders stay; roster updates; DMs to moved racers |
| Already balanced | `unchanged: true`; no DMs |
| Single group | Hint hidden |
| After `starts_at` | Hint hidden; API `REGISTRATION_AFTER_START` |

### Display

- [ ] Hero cover (16:9 band); default by event type.
- [ ] Organiser: real server name, not placeholder `Server`.
- [ ] Roster: per-group sections (leader + drivers) with `n/12`, then a Waitlist section with queue positions; Xbox lobby hint when not leader.
- [ ] Track codes, car rules, tuning restrictions, optional description text.
- [ ] Realtime: second client join → roster and count update without F5.

### Back navigation (`location.state.from`)

- [ ] **My Events** → event → **Back** → My Events (not Browse).
- [ ] **Browse** → event → **Back** → Browse.
- [ ] **Profile** recent event → **Back** → Profile.
- [ ] Host: list → event → **Submit results** → submit → **Back** → same list.
- [ ] Hard refresh on event detail → **Back** uses fallback (Browse, or My Events for draft host).

### Negative

- [ ] Join without auth → retry auth, not silent fail.
- [ ] Invalid gamertag (empty, 16+ chars, bad chars).
- [ ] Registration closed (cancelled/completed/archived/live).
- [ ] Rate limit → i18n message, not raw JSON.

---

## 5. Event Detail — host

### Draft

- [ ] Draft badge; Edit / Delete.
- [ ] Delete → `ConfirmDialog` (not native `confirm`).
- [ ] My Events card → `/create?edit=`, not public detail.
- [ ] Other users: no draft in browse; cannot open foreign draft URL.

### Published, before start

- [ ] Edit → wizard with **locked** guild + channel.
- [ ] Save does **not** revert `open` → `draft`.
- [ ] Host cannot Join.
- [ ] **Cancel event** on Review (Create wizard) when published and not finalized.

### Published, after start

- [ ] **Event Detail:** **Submit results** + **Cancel event** (separate buttons; Detail uses `canCancelEvent` = after start only).
- [ ] Field edit closed (`canEditEvent` false).
- [ ] Cancel → confirm → `cancelled`; grey embed; button disabled.
- [ ] Submit results → immutable (repeat → 409).
- [ ] Submit results → **Event Detail** shows table immediately (navigation seed); no false “pending host” flash.
- [ ] **Multi-group:** submit screen shows a block per group; positions restart at 1 per group; standings table renders per-group headers. Waitlisted racers are excluded from results.
- [ ] **Event Detail** results load error → **Try again** recovers table (Activity proxy / offline).
- [ ] **Submit results** screen: if existing-results check fails, warning + **Try again** still allows submit; successful recheck redirects when rows exist.

### Post-results

- [ ] Completed: results on detail; embed **COMPLETED**.
- [ ] Participant placement in My Events / Profile when joined + completed.

---

## 6. Create Event wizard

**Steps:** Event → Publish.

**Persistence:** manual save only (no autosave / WIP / leave guard).

### Event step

- [ ] Validation on empty title / type / date.
- [ ] All event types — correct badge/colors on cards after publish.
- [ ] Cover: default → custom → compress 16:9.
- [ ] Cover upload **after** first draft save (`upload-cover` + `guild_id`).
- [ ] **Save as draft** → My Events.
- [ ] **Continue to publish** → Publish step.

### Publish step

| Area | Cases |
|------|--------|
| **Cars** | `anything_goes` optional PI cap + optional extra restrictions (empty → no car-rules UI/embed field); `restricted_list` ≥1 catalog car; tuning restrictions on embed |
| **Tracks** | 0, 1, many; dedupe on save |
| **Target** | Guild list = user guilds ∩ bot installed; empty → Add bot → Refresh |
| **Target** | Guild change → channels load after guild list; channel re-validate |
| **Target** | Rate limit / transient API error → saved channel **not** cleared on re-open `?edit=` |
| **Target** | No Manage Server → forbidden with clear copy |
| **Convoy** | Self (host gamertag) vs `list-guild-members` picker |
| **Publish** | Save as draft **without leaving** Publish step |
| **Publish** | Save draft without channel → OK; My Events from Event step |
| **Publish** | Publish blocked without channel / leader / cars (restricted) |
| **Publish** | Publish modal if channel skipped |
| **Publish** | Success: embed in channel; guild/channel locked |
| **Publish** | Double-click publish → one embed; `PUBLISH_IN_PROGRESS` or idempotent second call |
| **Edit URL** | `/create?edit={id}` requires sign-in in browser; missing draft → My Events (no empty form) |

### Edit published (before start)

- [ ] Change title, cars, cover, leader — not guild/channel.
- [ ] Embed PATCH after save.
- [ ] API rejects guild/channel change → `TARGET_*_LOCKED`.

### Delete / cancel

- [ ] Delete draft only from wizard/detail.
- [ ] **Review:** cancel published until finalized (`canCancelPublishedEvent` — before or after start).
- [ ] **Detail:** cancel only after start (`canCancelEvent`); submit results from Detail/Results flow.

---

## 7. My Events

| Scope | Cases |
|-------|--------|
| **All** | Hosted + joined + **drafts on top** (published may render first; refresh while drafts load) |
| **Hosted** | Own events + drafts |
| **Joined** | Any roster row (incl. waitlist + host-assigned leader); not host; **no drafts** |
| **Joined — host-assigned leader** | Host picks viewer as convoy leader → event appears in **Joined** / **All** without manual refresh (realtime refetch); **Leave** blocked; convoy-leader Xbox hint on Detail |
| **Joined — waitlist** | Full lobby join → event in **Joined**; card shows **Waitlisted** badge; **Leave waitlist** works |
| Drafts API fail | Warning; published list still loads |
| Completed | Placement badges where applicable |
| Not signed in | Copy + retry auth |

---

## 8. Profile

- [ ] Gamertag via `user-profile`.
- [ ] **EN | RU** → Browse, Detail, Create, errors.
- [ ] `date-fns` locale on dates.
- [ ] Hosted / participated stats.
- [ ] Recent completed + placements.
- [ ] **DM bell:** no mutual guild with bot → toggle **off** (even when DB default on); enable → **Add bot** dialog; after install + return to Activity → toggle **on** without re-saving.

---

## 9. Discord embed sync (pilot-critical)

Verify **in channel** after each action:

| Action | Embed |
|--------|--------|
| Publish | Title, date, tracks, cars/rules, **n/12**, leader, cover, Register button |
| Join / leave | Participant count |
| Save published | Fields updated |
| Cancel | CANCELLED, grey, button disabled |
| Submit results | COMPLETED, button relabelled |
| After `starts_at` | LIVE / registration closed |
| Full lobby | 12/12 consistent with Activity |

**Negative:** message deleted in Discord → app does not crash; Edge logs `{ok:false}` for ops.

---

## 10. Multi-user and races

- [ ] Two players join last slot: one success, one `EVENT_FULL`.
- [ ] Concurrent leave + join → correct final count (`enforce_event_participant_capacity`).
- [ ] Host changes leader while assigned leader in roster → old leader cannot leave.
- [ ] `host_assigned` + voluntary join does not break leader flag.
- [ ] Realtime + manual refresh — count does not regress.

---

## 11. Activity-specific UI

- [ ] `ConfirmDialog` for delete/cancel/critical leave (no native dialogs).
- [ ] `openExternalLink` for bot install.
- [ ] Covers: Supabase URL → `/supabase/...` in `<img>`.
- [ ] PIP layout: logo-only compact UI.
- [ ] Long title/description — embed truncation OK; Activity layout OK.
- [ ] Busy labels on join/leave/save/publish (EN + RU).

---

## 12. API error spot-check

At least one mapped message per screen:

`BOT_NOT_IN_GUILD`, `BOT_CANNOT_POST`, `CHANNEL_NOT_FOUND`, `CHANNEL_NOT_TEXT`, `CHANNEL_WRONG_GUILD`, `EVENT_FULL`, `REGISTRATION_CLOSED`, `REGISTRATION_AFTER_START`, `HOST_CANNOT_JOIN`, `LEADER_CANNOT_LEAVE`, `RESULTS_PARTICIPANTS_ONLY`, `TOO_MANY_REQUESTS`, `UNAUTHORIZED`.

---

## 13. Post-deploy smoke (~15 min)

1. Auth + Browse  
2. Embed → Detail → Join → Leave  
3. Create draft → Publish → embed OK  
4. Second user join → embed count  
5. My Events hosted + joined  
6. RU toggle on one screen  
7. Profile bell off → no opt-out DMs; waitlist promote DM still arrives  

---

## 14. Discord DM notifications

**Prereq:** §0.8–0.9 deployed.

| Case | Steps | Expected |
|------|--------|----------|
| No mutual guild | Profile with account that shares no server with the bot | Bell **off**; enable → Add bot dialog |
| After bot install | Add bot via dialog → return to Activity tab | Bell **on** (DB pref still default true) |
| Opt-out | Profile → bell off | No cancel / leader / 2h / host-fill / tracks-only edit DMs; **reschedule** DM still sent |
| Waitlist promote | Fill group; user on waitlist; active racer leaves | Promoted user gets **seat opened** DM (even if bell off) |
| Host group full (partial) | `group_count ≥ 2`; one group fills while another has open seats | Host does **not** get **group filled** DM |
| Host group full (lobby) | Last open seat in the **last** group fills (all groups full) | Host gets **group filled** DM for that group |
| Cancel | Host cancels published event | Active + waitlist get cancel DM; pending 2h reminders skipped; **host does not** |
| Published edit | Host changes date/time, tracks, and/or cars → **Save & notify** | Active racers get update DM; waitlist too when **date/time** changes |
| Add group (empty waitlist) | Host adds group with guild leader | New leader gets **convoy leader assigned** DM |
| DM button | Open DM → **Open event** | Link opens `forza.events/event/{id}` (or Activity origin) |
| 2h reminder | Event starts in ~2h (cron running) | Active racers + host get soon DM; reschedule changes dedupe |

**Negative:** `process-notifications` without `x-cron-secret` → 401 in prod.

---

## Out of scope

- Playwright in CI — see [`ENGINEERING.md`](ENGINEERING.md).
- Standalone OAuth on the raw Railway hostname (`*.up.railway.app`) — by design (`DiscordOnlyGate`). Use **forza.events** for browser web.
- Always-on bot worker — [`bot/README.md`](../bot/README.md).

---

## Priorities

| Priority | Sections |
|----------|----------|
| **P0** (launch blocker) | 0, 1, 2, 6 (publish target + bot install), 9, 4 (join/full/leave) |
| **P1** (trust) | 3 realtime, 5 host cancel/results, 10 races, 7 drafts, **14 notifications** |
| **P2** (polish) | i18n, PIP layout, all event types, car-rule combinations |

**Suggested runs:** **Day 0** (P0) after deploy; **Pilot week** (P1–P2).
