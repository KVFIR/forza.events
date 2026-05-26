import type {AppUser, EventType, ForzaEvent} from './types';

export type EventSortKey = 'event_date' | 'created' | 'fill';

export type MyEventsScope = 'all' | 'hosted' | 'joined';

export function eventFillRatio(event: ForzaEvent): number {
  if (event.maxPlayers <= 0) return 0;
  return event.currentPlayers / event.maxPlayers;
}

export function sortEvents(events: ForzaEvent[], sort: EventSortKey): ForzaEvent[] {
  const list = [...events];
  switch (sort) {
    case 'created':
      return list.sort(
        (a, b) =>
          new Date(b.createdAt ?? b.startsAt).getTime() -
          new Date(a.createdAt ?? a.startsAt).getTime(),
      );
    case 'fill':
      return list.sort((a, b) => eventFillRatio(a) - eventFillRatio(b));
    case 'event_date':
    default:
      return list.sort(
        (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
  }
}

export function filterByEventType(events: ForzaEvent[], type: EventType | 'all'): ForzaEvent[] {
  if (type === 'all') return events;
  return events.filter((e) => e.type === type);
}

export function isDraftEvent(event: ForzaEvent): boolean {
  return event.lifecycle === 'draft';
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
  isJoined: (event: ForzaEvent) => boolean,
): ForzaEvent[] {
  return events.filter((e) => {
    const hosted = e.hostDiscordId === user.discordId;
    const joined = isJoined(e);
    switch (scope) {
      case 'hosted':
        return hosted;
      case 'joined':
        return joined;
      case 'all':
      default:
        return hosted || joined;
    }
  });
}
