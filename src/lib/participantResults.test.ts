import {beforeEach, describe, expect, it, vi} from 'vitest';

const invokeBrowseEvents = vi.hoisted(() => vi.fn());
const getSupabase = vi.hoisted(() => vi.fn());
const shouldUseDirectSupabaseReads = vi.hoisted(() => vi.fn(() => false));
const isDiscordActivityFrame = vi.hoisted(() => vi.fn(() => false));

vi.mock('./api', () => ({
  invokeBrowseEvents,
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

import {
  fetchParticipantResultsMap,
  participantResultsFromBrowseRows,
} from './participantResults';

const EVENT_ID = '11111111-1111-4111-8111-111111111111';

describe('participantResultsFromBrowseRows', () => {
  it('maps finish and ranked delta for the viewer', () => {
    const map = participantResultsFromBrowseRows(
      [
        {
          id: EVENT_ID,
          event_results: [
            {discord_id: 'd1', position: 2, dnf: false, dns: false},
            {discord_id: 'd2', position: 1, dnf: false, dns: false},
          ],
          rating_ledger: [
            {discord_id: 'd1', delta: 12},
            {discord_id: 'd2', delta: -8},
          ],
        },
      ],
      'd1',
    );
    expect(map.get(EVENT_ID)).toEqual({
      position: 2,
      dnf: false,
      dns: false,
      ratingDelta: 12,
    });
  });

  it('skips events where the viewer has no result row', () => {
    const map = participantResultsFromBrowseRows(
      [{id: EVENT_ID, event_results: [{discord_id: 'other', position: 1}]}],
      'd1',
    );
    expect(map.size).toBe(0);
  });
});

describe('fetchParticipantResultsMap', () => {
  beforeEach(() => {
    invokeBrowseEvents.mockReset();
    getSupabase.mockReset();
    shouldUseDirectSupabaseReads.mockReset();
    isDiscordActivityFrame.mockReset();
    shouldUseDirectSupabaseReads.mockReturnValue(false);
    isDiscordActivityFrame.mockReturnValue(false);
    invokeBrowseEvents.mockResolvedValue({
      data: [
        {
          id: EVENT_ID,
          event_results: [{discord_id: 'd1', position: 3, dnf: false, dns: false}],
          rating_ledger: [{discord_id: 'd1', delta: -5}],
        },
      ],
    });
  });

  it('loads via browse-events event_ids when PostgREST is not used', async () => {
    const map = await fetchParticipantResultsMap([EVENT_ID], 'd1');
    expect(invokeBrowseEvents).toHaveBeenCalledWith({
      event_ids: [EVENT_ID],
      include_completed: true,
    });
    expect(getSupabase).not.toHaveBeenCalled();
    expect(map.get(EVENT_ID)?.position).toBe(3);
    expect(map.get(EVENT_ID)?.ratingDelta).toBe(-5);
  });

  it('uses PostgREST on localhost', async () => {
    shouldUseDirectSupabaseReads.mockReturnValue(true);
    getSupabase.mockResolvedValue({
      from: (table: string) => ({
        select: () => ({
          in: () => ({
            eq: async () =>
              table === 'event_results'
                ? {data: [{event_id: EVENT_ID, position: 1, dnf: false, dns: false}], error: null}
                : {data: [{event_id: EVENT_ID, delta: 4}], error: null},
          }),
        }),
      }),
    });
    const map = await fetchParticipantResultsMap([EVENT_ID], 'd1');
    expect(invokeBrowseEvents).not.toHaveBeenCalled();
    expect(map.get(EVENT_ID)).toEqual({
      position: 1,
      dnf: false,
      dns: false,
      ratingDelta: 4,
    });
  });

  it('falls back to PostgREST when Edge errors', async () => {
    invokeBrowseEvents.mockRejectedValue(new Error('down'));
    getSupabase.mockResolvedValue({
      from: () => ({
        select: () => ({
          in: () => ({
            eq: async () => ({data: [], error: null}),
          }),
        }),
      }),
    });
    await fetchParticipantResultsMap([EVENT_ID], 'd1');
    expect(getSupabase).toHaveBeenCalled();
  });

  it('falls back to PostgREST when Edge still returns a list-select payload', async () => {
    invokeBrowseEvents.mockResolvedValue({data: [{id: EVENT_ID, title: 'Summer Cup'}]});
    getSupabase.mockResolvedValue({
      from: () => ({
        select: () => ({
          in: () => ({
            eq: async () => ({data: [], error: null}),
          }),
        }),
      }),
    });
    await fetchParticipantResultsMap([EVENT_ID], 'd1');
    expect(getSupabase).toHaveBeenCalled();
  });
});
