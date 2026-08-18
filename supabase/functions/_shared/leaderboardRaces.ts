/** Last ranked race + viewer history mapping for the ladder Edge payload. */

export type LeaderboardLastRace = {
  eventId: string;
  slug?: string | null;
  title: string;
  startsAt: string;
  delta: number;
  ratingAfter?: number;
};

export type LatestRaceRow = {
  discord_id: string;
  event_id: string;
  event_title: string;
  starts_at: string;
  delta: number;
};

export function indexLatestRaces(rows: LatestRaceRow[]): Map<string, LeaderboardLastRace> {
  const map = new Map<string, LeaderboardLastRace>();
  for (const row of rows) {
    if (map.has(row.discord_id)) continue;
    const title = row.event_title?.trim();
    if (!title) continue;
    map.set(row.discord_id, {
      eventId: row.event_id,
      title,
      startsAt: row.starts_at,
      delta: row.delta,
    });
  }
  return map;
}

type EventJoin = {title?: string | null; starts_at?: string | null; slug?: string | null};

function unwrapEvent(join: EventJoin | EventJoin[] | null | undefined): EventJoin | null {
  if (!join) return null;
  return Array.isArray(join) ? (join[0] ?? null) : join;
}

export type LedgerHistoryRow = {
  event_id: string;
  delta: number;
  rating_after?: number | null;
  events?: EventJoin | EventJoin[] | null;
};

export function mapViewerRaces(rows: LedgerHistoryRow[]): LeaderboardLastRace[] {
  const out: LeaderboardLastRace[] = [];
  for (const row of rows) {
    const event = unwrapEvent(row.events);
    const title = event?.title?.trim();
    if (!title) continue;
    const mapped: LeaderboardLastRace = {
      eventId: row.event_id,
      title,
      startsAt: event?.starts_at ?? '',
      delta: row.delta,
    };
    const slug = event?.slug?.trim();
    if (slug) mapped.slug = slug;
    if (row.rating_after != null) mapped.ratingAfter = row.rating_after;
    out.push(mapped);
  }
  return out;
}
