import {describe, expect, it} from 'vitest';
import {indexLatestRaces, mapViewerRaces} from '../supabase/functions/_shared/leaderboardRaces.ts';

describe('indexLatestRaces', () => {
  it('keeps the first row per driver and skips blank titles', () => {
    const map = indexLatestRaces([
      {
        discord_id: 'a',
        event_id: 'e1',
        event_title: 'Night Circuit',
        starts_at: '2026-05-01T00:00:00Z',
        delta: 14,
      },
      {
        discord_id: 'a',
        event_id: 'e0',
        event_title: 'Older',
        starts_at: '2026-04-01T00:00:00Z',
        delta: -3,
      },
      {
        discord_id: 'b',
        event_id: 'e2',
        event_title: '   ',
        starts_at: '2026-05-02T00:00:00Z',
        delta: 5,
      },
    ]);
    expect(map.get('a')).toEqual({
      eventId: 'e1',
      title: 'Night Circuit',
      startsAt: '2026-05-01T00:00:00Z',
      delta: 14,
    });
    expect(map.has('b')).toBe(false);
  });
});

describe('mapViewerRaces', () => {
  it('unwraps object or array event joins and drops rows without a title', () => {
    expect(
      mapViewerRaces([
        {
          event_id: 'e1',
          delta: 14,
          rating_after: 1514,
          events: {title: 'Night Circuit', starts_at: '2026-05-01T18:00:00Z', slug: 'night-circuit-20260501'},
        },
        {
          event_id: 'e2',
          delta: -8,
          events: [{title: 'Dirt Run', starts_at: '2026-04-20T18:00:00Z'}],
        },
        {event_id: 'e3', delta: 1, events: null},
      ]),
    ).toEqual([
      {
        eventId: 'e1',
        title: 'Night Circuit',
        startsAt: '2026-05-01T18:00:00Z',
        delta: 14,
        ratingAfter: 1514,
        slug: 'night-circuit-20260501',
      },
      {
        eventId: 'e2',
        title: 'Dirt Run',
        startsAt: '2026-04-20T18:00:00Z',
        delta: -8,
      },
    ]);
  });
});
