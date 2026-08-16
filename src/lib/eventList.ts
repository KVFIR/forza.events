import {isPublishedToDiscord} from './eventSpec';
import type {AppUser, EventType, ForzaEvent} from './types';

export type EventSortKey = 'event_date' | 'created' | 'fill';

export type MyEventsScope = 'all' | 'hosted' | 'joined';

/** Gate My Events list until auth resolves and optional host drafts are ready. */
export function resolveMyEventsCatalogLoading(input: {
  scope: MyEventsScope;
  authLoading: boolean;
  publishedLoading: boolean;
  isSignedIn: boolean;
  draftsLoading: boolean;
}): boolean {
  const mightNeedDrafts = input.scope !== 'joined';
  if (mightNeedDrafts && input.authLoading) return true;
  if (input.publishedLoading) return true;
  if (mightNeedDrafts && input.isSignedIn && input.draftsLoading) return true;
  return false;
}

export function eventFillRatio(event: ForzaEvent): number {
  if (event.maxPlayers <= 0) return 0;
  return event.currentPlayers / event.maxPlayers;
}

function compareBySortKey(a: ForzaEvent, b: ForzaEvent, sort: EventSortKey): number {
  switch (sort) {
    case 'created':
      return (
        new Date(b.createdAt ?? b.startsAt).getTime() -
        new Date(a.createdAt ?? a.startsAt).getTime()
      );
    case 'fill':
      return eventFillRatio(a) - eventFillRatio(b);
    case 'event_date':
      return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
    default: {
      const _exhaustive: never = sort;
      void _exhaustive;
      return 0;
    }
  }
}

/** Active first (asc/desc per key); completed uses the same key, except event_date (newest past first). */
export function sortEvents(events: ForzaEvent[], sort: EventSortKey): ForzaEvent[] {
  const active = events.filter((e) => e.lifecycle !== 'completed');
  const completed = events.filter((e) => e.lifecycle === 'completed');
  const byKey = (a: ForzaEvent, b: ForzaEvent) => compareBySortKey(a, b, sort);
  const completedOrder =
    sort === 'event_date' ? (a: ForzaEvent, b: ForzaEvent) => byKey(b, a) : byKey;
  return [...active.sort(byKey), ...completed.sort(completedOrder)];
}

export function filterByEventType(events: ForzaEvent[], type: EventType | 'all'): ForzaEvent[] {
  if (type === 'all') return events;
  return events.filter((e) => e.type === type);
}

export function filterByGame(
  events: ForzaEvent[],
  game: import('./eventGames').ForzaGame | 'all',
): ForzaEvent[] {
  if (game === 'all') return events;
  return events.filter((e) => e.game === game);
}

export type RankedFilter = 'all' | 'ranked';

export function filterByRanked(events: ForzaEvent[], ranked: RankedFilter): ForzaEvent[] {
  if (ranked === 'all') return events;
  return events.filter((e) => e.isRanked);
}

export function isDraftEvent(event: ForzaEvent): boolean {
  return !isPublishedToDiscord(event);
}

/** Newest draft first (by created or scheduled start). */
export function sortHostDrafts(events: ForzaEvent[]): ForzaEvent[] {
  return [...events].sort(
    (a, b) =>
      new Date(b.createdAt ?? b.startsAt).getTime() -
      new Date(a.createdAt ?? a.startsAt).getTime(),
  );
}

/** Drafts at the top; published list must not duplicate draft ids. */
export function mergeHostDraftsFirst(
  drafts: ForzaEvent[],
  published: ForzaEvent[],
): ForzaEvent[] {
  const draftIds = new Set(drafts.map((e) => e.id));
  return [...drafts, ...published.filter((e) => !draftIds.has(e.id))];
}

/**
 * My Events list: drafts first, then published (deduped by id).
 * Caller should keep the list in a loading state until drafts are fetched when `includeDrafts`.
 */
export function buildScopedMyEventsList(
  scope: MyEventsScope,
  options: {
    includeDrafts: boolean;
    drafts: ForzaEvent[];
    published: ForzaEvent[];
  },
): ForzaEvent[] {
  const {includeDrafts, drafts, published} = options;
  if (scope === 'joined' || !includeDrafts) return published;
  return mergeHostDraftsFirst(drafts, published);
}

/** Active events first, then completed (newest start date first within each group). */
export function sortMyEventsList(events: ForzaEvent[]): ForzaEvent[] {
  const active = events.filter((e) => e.status !== 'ended');
  const ended = events.filter((e) => e.status === 'ended');
  const byDateDesc = (a: ForzaEvent, b: ForzaEvent) =>
    new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime();
  return [...active.sort(byDateDesc), ...ended.sort(byDateDesc)];
}

export function filterMyEvents(
  events: ForzaEvent[],
  user: AppUser,
  scope: MyEventsScope,
  isParticipating: (event: ForzaEvent) => boolean,
): ForzaEvent[] {
  return events.filter((e) => {
    const hosted = e.hostDiscordId === user.discordId;
    const participating = isParticipating(e);
    switch (scope) {
      case 'hosted':
        return hosted;
      case 'joined':
        return participating;
      case 'all':
      default:
        return hosted || participating;
    }
  });
}
