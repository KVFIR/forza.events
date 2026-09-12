import {beforeEach, describe, expect, it, vi} from 'vitest';

const invokeBrowseEvents = vi.hoisted(() => vi.fn());
const getSupabase = vi.hoisted(() => vi.fn());
const shouldUseDirectSupabaseReads = vi.hoisted(() => vi.fn(() => false));
const isDiscordActivityFrame = vi.hoisted(() => vi.fn(() => false));

vi.mock('./api', () => ({
  invokeBrowseEvents,
  invokeHostDrafts: vi.fn(),
}));

vi.mock('./supabase', () => ({
  isSupabaseConfigured: () => true,
  getSupabase,
}));

vi.mock('./supabaseEnv', () => ({
  shouldUseDirectSupabaseReads,
  isDiscordActivityFrame,
  canUsePostgrestReads: () => true,
}));

import {fetchEventById, fetchEventResults} from './events';

const rankedDetailRow = {
  id: 'e1',
  slug: 'summer-cup',
  title: 'Summer Cup',
  type: 'road',
  status: 'open',
  starts_at: '2099-01-01T12:00:00.000Z',
  voice_policy: 'optional',
  max_players: 12,
  current_players: 1,
  host_discord_id: 'host',
  is_ranked: true,
  event_participants: [
    {
      discord_id: 'd1',
      gamertag_snapshot: 'XboxGT',
      users: {
        username: 'disc_user',
        player_ratings: {rating: 1514, games_rated: 1},
      },
    },
  ],
};

describe('fetchEventById', () => {
  beforeEach(() => {
    invokeBrowseEvents.mockReset();
    getSupabase.mockReset();
    shouldUseDirectSupabaseReads.mockReset();
    isDiscordActivityFrame.mockReset();
    shouldUseDirectSupabaseReads.mockReturnValue(false);
    isDiscordActivityFrame.mockReturnValue(false);
    invokeBrowseEvents.mockResolvedValue({data: []});
    getSupabase.mockResolvedValue({
      from: () => ({
        select: () => ({
          neq: () => ({
            eq: async () => ({data: [], error: null}),
          }),
        }),
      }),
    });
  });

  it('loads via browse-events even without a Discord token', async () => {
    await fetchEventById('summer-cup');
    expect(invokeBrowseEvents).toHaveBeenCalledWith(
      expect.objectContaining({event_id: 'summer-cup', include_completed: true}),
      null,
    );
  });

  it('maps Edge detail payload including nested player rating', async () => {
    invokeBrowseEvents.mockResolvedValue({data: [rankedDetailRow]});
    const event = await fetchEventById('summer-cup');
    expect(event?.title).toBe('Summer Cup');
    expect(event?.participants[0]?.rating).toBe(1514);
    expect(getSupabase).not.toHaveBeenCalled();
  });

  it('maps two event_cars rows of the same catalog car', async () => {
    const catalog = {id: 'catalog-1', make: 'Ford', model: 'Ford GT', year: 2017, pi: 800};
    invokeBrowseEvents.mockResolvedValue({
      data: [
        {
          ...rankedDetailRow,
          event_cars: [
            {
              id: 'row-1',
              sort_order: 0,
              max_pi: 800,
              tune_share_code: '111 111 111',
              car_restrictions: [],
              cars: catalog,
            },
            {
              id: 'row-2',
              sort_order: 1,
              max_pi: 900,
              tune_share_code: '222 222 222',
              car_restrictions: ['No engine swap'],
              cars: catalog,
            },
          ],
        },
      ],
    });
    const event = await fetchEventById('summer-cup');
    expect(event?.allowedCars).toEqual([
      expect.objectContaining({id: 'row-1', carId: 'catalog-1', maxPi: 800}),
      expect.objectContaining({id: 'row-2', carId: 'catalog-1', maxPi: 900}),
    ]);
  });

  it('synthesizes unique ids when event_cars.id is missing', async () => {
    const catalog = {id: 'catalog-1', make: 'Ford', model: 'Ford GT', year: 2017, pi: 800};
    invokeBrowseEvents.mockResolvedValue({
      data: [
        {
          ...rankedDetailRow,
          event_cars: [
            {sort_order: 0, max_pi: 800, cars: catalog},
            {sort_order: 0, max_pi: 900, cars: catalog},
          ],
        },
      ],
    });
    const event = await fetchEventById('summer-cup');
    expect(event?.allowedCars.map((c) => c.id)).toEqual(['catalog-1:0', 'catalog-1:1']);
  });

  it('skips PostgREST when Edge confirms a miss', async () => {
    shouldUseDirectSupabaseReads.mockReturnValue(true);
    await expect(fetchEventById('summer-cup')).resolves.toBeUndefined();
    expect(getSupabase).not.toHaveBeenCalled();
  });

  it('falls back to PostgREST on localhost when Edge errors', async () => {
    shouldUseDirectSupabaseReads.mockReturnValue(true);
    invokeBrowseEvents.mockRejectedValue(new Error('down'));
    await fetchEventById('summer-cup');
    expect(getSupabase).toHaveBeenCalled();
  });

  it('falls back to PostgREST when Edge errors', async () => {
    invokeBrowseEvents.mockRejectedValue(new Error('down'));
    await fetchEventById('summer-cup');
    expect(getSupabase).toHaveBeenCalled();
  });
});

describe('fetchEventResults', () => {
  beforeEach(() => {
    invokeBrowseEvents.mockReset();
    getSupabase.mockReset();
    shouldUseDirectSupabaseReads.mockReset();
    isDiscordActivityFrame.mockReset();
    shouldUseDirectSupabaseReads.mockReturnValue(false);
    isDiscordActivityFrame.mockReturnValue(false);
  });

  it('loads via browse-events by id when PostgREST is not used', async () => {
    invokeBrowseEvents.mockResolvedValue({
      data: [
        {
          ...rankedDetailRow,
          event_results: [{discord_id: 'd1', position: 2, dnf: false, dns: false}],
        },
      ],
    });
    const outcome = await fetchEventResults('e1');
    expect(invokeBrowseEvents).toHaveBeenCalledWith(
      expect.objectContaining({event_id: 'e1', include_completed: true}),
      null,
    );
    expect(getSupabase).not.toHaveBeenCalled();
    expect(outcome).toEqual({
      rows: [{discordId: 'd1', position: 2, dnf: false, dns: false, points: undefined, groupIndex: 1}],
      error: null,
    });
  });

  it('falls back to PostgREST when Edge errors', async () => {
    invokeBrowseEvents.mockRejectedValue(new Error('down'));
    getSupabase.mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: async () => ({data: [], error: null}),
          }),
        }),
      }),
    });
    await expect(fetchEventResults('e1')).resolves.toEqual({rows: [], error: null});
    expect(getSupabase).toHaveBeenCalled();
  });

  it('falls back to PostgREST when Edge returns no row', async () => {
    invokeBrowseEvents.mockResolvedValue({data: []});
    getSupabase.mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: async () => ({
              data: [{discord_id: 'd1', position: 1, dnf: false, dns: false, points: 10, group_index: 1}],
              error: null,
            }),
          }),
        }),
      }),
    });
    await expect(fetchEventResults('e1')).resolves.toEqual({
      rows: [{discordId: 'd1', position: 1, dnf: false, dns: false, points: 10, groupIndex: 1}],
      error: null,
    });
    expect(getSupabase).toHaveBeenCalled();
  });

  it('falls back to PostgREST when Edge omits event_results', async () => {
    invokeBrowseEvents.mockResolvedValue({data: [rankedDetailRow]});
    getSupabase.mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: () => ({
            order: async () => ({data: [], error: null}),
          }),
        }),
      }),
    });
    await fetchEventResults('e1');
    expect(getSupabase).toHaveBeenCalled();
  });
});
