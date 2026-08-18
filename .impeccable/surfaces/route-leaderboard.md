---
version: 1
slug: "route-leaderboard"
primary_target: "route:/leaderboard"
related_targets: ["src/screens/Leaderboard.tsx"]
---

# /leaderboard

- **Mode:** Operate
- **Audience:** Racers and guests opening Ladder in Discord Activity or on forza.events
- **Job:** Scan the global rated field. A signed-in driver also sees their standing (and ranked-race log when they have races), then the field. Last-race titles open Event Detail (`/event/:slug`; UUID still resolves).
- **Direction:** Comp C timing tower (seed `bfea84de`) + driver avatars + one-row status plate. Approved: `.impeccable/mocks/leaderboard-comp-c-tower.png`. Memorable moment: a hairline board you scan like a tower — not a trophy podium and not a second Profile.
- **Keep:** Neon Pits (Panel, 10px tracked caps labels, violet interaction). No page H1 and no subtitle (nav already says Ladder). Guest access. No provisional asterisk or footnote.
- **Anti-goals:** trophies/podium, page-level “LADDER” heading, invented sidebar items from the comp, last-race as cover EventCards, giant hero metrics

## Shipped composition

First viewport: optional plate, optional log, then the board. App chrome and 42rem column are inherited; this route adds no H1, no subtitle, and no extra nav.

**Guest:** table (or empty/error). No plate, no log.

**Signed-in** (rated or not):

1. **Campaign plate** — one Panel, one row: avatar (40px) + gamertag (else `@handle`) on the left; `@handle` only as a second line when a gamertag is set. Rank / Rating / Races packed on the right (caps dts, 14px semibold values; rating uses accent-purple-light). Unrated: rank and rating are em dash, races `0`. No second stats row.
2. **Your ranked races** — caps section label, then a Panel list (white title link, muted date; rating after that race + signed delta on the right, no “Δ” prefix). Omit the whole section when `races` is empty. Edge caps the log at 8. White titles are an exception; table last-race links stay muted.
3. **Table** — viewer row fill `accent-purple/10`; rank, name, and rating go brighter/violet. Other rows: hairline + faint hover.

**Table columns:** Rank (black tabular) · avatar (28px) · Driver · Rating · Last Δ · Last race. Below `sm`, Last race drops as a column and the event title sits under the name. Signed deltas (`+12` / `-5`) are green when up, muted red when down, muted when zero, em dash when missing — no “Δ” prefix on the number. Last-race titles are muted truncated text links, not cards.

**States:** page spinner while loading; EmptyState + Try again on load failure; EmptyState “No rated drivers yet” when the board is empty.

## Unresolved

Last-race titles and Δ stay em dash until migration `038` and the `leaderboard` Edge deploy. Ranks and ratings still render.

## Finish

Ship. Finish review: all five material fixes resolved.
