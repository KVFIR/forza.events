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
}));

import {fetchEventById} from './events';

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

  it('falls back to PostgREST in Activity when Edge errors', async () => {
    isDiscordActivityFrame.mockReturnValue(true);
    invokeBrowseEvents.mockRejectedValue(new Error('down'));
    await fetchEventById('summer-cup');
    expect(getSupabase).toHaveBeenCalled();
  });

  it('skips PostgREST on forza.events when Edge errors', async () => {
    invokeBrowseEvents.mockRejectedValue(new Error('down'));
    await expect(fetchEventById('summer-cup')).resolves.toBeUndefined();
    expect(getSupabase).not.toHaveBeenCalled();
  });
});
