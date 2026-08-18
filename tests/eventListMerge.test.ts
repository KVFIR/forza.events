import {describe, expect, it} from 'vitest';
import {
  buildScopedMyEventsList,
  filterByCancelled,
  resolveMyEventsCatalogLoading,
  sortEvents,
  sortMyEventsPublished,
} from '../src/lib/eventList';
import type {ForzaEvent} from '../src/lib/types';

function event(id: string, title: string, overrides: Partial<ForzaEvent> = {}): ForzaEvent {
  return {
    id,
    title,
    type: 'road',
    game: 'fh6',
    status: 'draft',
    lifecycle: 'draft',
    startsAt: '2026-08-01T12:00:00.000Z',
    hostDiscordId: 'host',
    guildId: 'g1',
    maxPlayers: 12,
    currentPlayers: 0,
    groupCount: 1,
    carRuleMode: 'anything_goes',
    maxPi: 800,
    allowedCars: [],
    participants: [],
    tracks: [],
    ...overrides,
  } as ForzaEvent;
}

describe('buildScopedMyEventsList', () => {
  const draft = event('draft-1', 'Draft');
  const published = event('pub-1', 'Published');
  published.status = 'open';

  it('merges drafts on top when drafts are ready', () => {
    const list = buildScopedMyEventsList('all', {
      includeDrafts: true,
      drafts: [draft],
      published: [published],
    });
    expect(list.map((e) => e.id)).toEqual(['draft-1', 'pub-1']);
  });

  it('joined scope ignores drafts', () => {
    const list = buildScopedMyEventsList('joined', {
      includeDrafts: true,
      drafts: [draft],
      published: [published],
    });
    expect(list.map((e) => e.id)).toEqual(['pub-1']);
  });
});

describe('sortEvents', () => {
  it('keeps completed after active when sorting by event date', () => {
    const completed = event('done', 'Done', {
      lifecycle: 'completed',
      status: 'ended',
      startsAt: '2026-07-01T12:00:00.000Z',
    });
    const upcoming = event('soon', 'Soon', {
      lifecycle: 'open',
      status: 'open',
      startsAt: '2026-09-01T12:00:00.000Z',
    });
    expect(sortEvents([completed, upcoming], 'event_date').map((e) => e.id)).toEqual([
      'soon',
      'done',
    ]);
  });

  it('orders completed newest-first by event date', () => {
    const older = event('old', 'Old', {
      lifecycle: 'completed',
      status: 'ended',
      startsAt: '2026-06-01T12:00:00.000Z',
    });
    const newer = event('new', 'New', {
      lifecycle: 'completed',
      status: 'ended',
      startsAt: '2026-07-01T12:00:00.000Z',
    });
    expect(sortEvents([older, newer], 'event_date').map((e) => e.id)).toEqual(['new', 'old']);
  });

  it('keeps created newest-first for completed events', () => {
    const older = event('old', 'Old', {
      lifecycle: 'completed',
      status: 'ended',
      createdAt: '2026-06-01T12:00:00.000Z',
      startsAt: '2026-06-01T12:00:00.000Z',
    });
    const newer = event('new', 'New', {
      lifecycle: 'completed',
      status: 'ended',
      createdAt: '2026-07-01T12:00:00.000Z',
      startsAt: '2026-07-01T12:00:00.000Z',
    });
    expect(sortEvents([older, newer], 'created').map((e) => e.id)).toEqual(['new', 'old']);
  });

  it('keeps cancelled after active when sorting by event date', () => {
    const cancelled = event('cx', 'Cancelled', {
      lifecycle: 'cancelled',
      status: 'ended',
      startsAt: '2026-07-01T12:00:00.000Z',
    });
    const upcoming = event('soon', 'Soon', {
      lifecycle: 'open',
      status: 'open',
      startsAt: '2026-09-01T12:00:00.000Z',
    });
    expect(sortEvents([cancelled, upcoming], 'event_date').map((e) => e.id)).toEqual([
      'soon',
      'cx',
    ]);
  });
});

describe('filterByCancelled', () => {
  const open = event('open', 'Open', {lifecycle: 'open', status: 'open'});
  const cancelled = event('cx', 'Cancelled', {
    lifecycle: 'cancelled',
    status: 'ended',
  });

  it('hides cancelled by default', () => {
    expect(filterByCancelled([open, cancelled], 'hide').map((e) => e.id)).toEqual(['open']);
  });

  it('keeps only cancelled when selected', () => {
    expect(filterByCancelled([open, cancelled], 'cancelled').map((e) => e.id)).toEqual(['cx']);
  });
});

describe('sortMyEventsPublished', () => {
  it('keeps drafts above published after sort', () => {
    const draft = event('draft-1', 'Draft');
    const later = event('later', 'Later', {
      lifecycle: 'open',
      status: 'open',
      discordMessageId: 'm1',
      startsAt: '2026-10-01T12:00:00.000Z',
    });
    const sooner = event('sooner', 'Sooner', {
      lifecycle: 'open',
      status: 'open',
      discordMessageId: 'm2',
      startsAt: '2026-09-01T12:00:00.000Z',
    });
    expect(
      sortMyEventsPublished([later, draft, sooner], 'event_date').map((e) => e.id),
    ).toEqual(['draft-1', 'sooner', 'later']);
  });
});

describe('resolveMyEventsCatalogLoading', () => {
  it('waits for auth on all/hosted before showing the merged list', () => {
    expect(
      resolveMyEventsCatalogLoading({
        scope: 'all',
        authLoading: true,
        publishedLoading: false,
        isSignedIn: false,
        draftsLoading: false,
      }),
    ).toBe(true);
  });

  it('waits for drafts after auth when signed in', () => {
    expect(
      resolveMyEventsCatalogLoading({
        scope: 'all',
        authLoading: false,
        publishedLoading: false,
        isSignedIn: true,
        draftsLoading: true,
      }),
    ).toBe(true);
  });

  it('does not wait for drafts on joined scope', () => {
    expect(
      resolveMyEventsCatalogLoading({
        scope: 'joined',
        authLoading: false,
        publishedLoading: false,
        isSignedIn: true,
        draftsLoading: true,
      }),
    ).toBe(false);
  });
});
