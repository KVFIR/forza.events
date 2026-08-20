import {describe, expect, it} from 'vitest';
import {normalizeClientEvent} from '../supabase/functions/_shared/clientAnalytics.ts';

describe('normalizeClientEvent', () => {
  it('accepts funnel events with optional fields', () => {
    const row = normalizeClientEvent(
      {
        name: 'join',
        outcome: 'success',
        event_id: '550e8400-e29b-41d4-a716-446655440000',
        meta: {waitlisted: false, group_index: 1},
      },
      'activity',
      '123',
    );
    expect(row).toMatchObject({
      surface: 'activity',
      event_name: 'join',
      outcome: 'success',
      discord_id: '123',
      event_id: '550e8400-e29b-41d4-a716-446655440000',
      meta: {waitlisted: false, group_index: 1},
    });
  });

  it('accepts notification preference events', () => {
    expect(
      normalizeClientEvent({name: 'notification_dm_enable', outcome: 'success'}, 'activity', '1')
        ?.event_name,
    ).toBe('notification_dm_enable');
    expect(
      normalizeClientEvent({name: 'notification_dm_disable', outcome: 'success'}, 'activity', '1')
        ?.event_name,
    ).toBe('notification_dm_disable');
    expect(
      normalizeClientEvent({name: 'notification_new_event_enable', outcome: 'success'}, 'activity', '1')
        ?.event_name,
    ).toBe('notification_new_event_enable');
  });

  it('rejects invalid names and meta', () => {
    expect(normalizeClientEvent({name: 'JOIN'}, 'unknown', null)).toBeNull();
    expect(normalizeClientEvent({name: 'not_allowed'}, 'unknown', null)).toBeNull();
    expect(
      normalizeClientEvent(
        {name: 'api_error', meta: {BadKey: 'x', nested: {a: 1}}},
        'browser_web',
        null,
      )?.meta,
    ).toEqual({});
  });

  it('accepts retry_event_ratings', () => {
    expect(
      normalizeClientEvent({name: 'retry_event_ratings', outcome: 'success'}, 'activity', '1')
        ?.event_name,
    ).toBe('retry_event_ratings');
  });

  it('keeps discord_id from session_expired when the request has no token user', () => {
    expect(
      normalizeClientEvent(
        {name: 'session_expired', discord_id: '123456789012345678'},
        'browser_web',
        null,
      )?.discord_id,
    ).toBe('123456789012345678');
  });

  it('ignores body discord_id on other events without a token user', () => {
    expect(
      normalizeClientEvent(
        {name: 'join', outcome: 'success', discord_id: '123456789012345678'},
        'browser_web',
        null,
      )?.discord_id,
    ).toBeNull();
  });
});
