import {describe, expect, it} from 'vitest';
import {
  eventDetailPath,
  eventMatchesRouteKey,
  eventUrlKey,
  isEventUuid,
} from '@edge/eventPath.ts';

const uuid = '94d86ab7-ce55-49f8-84e3-91f3b9a7b39c';

describe('eventPath', () => {
  it('prefers slug for public links and falls back to id', () => {
    expect(eventUrlKey({id: uuid, slug: 'sunset-sprint-20260715'})).toBe(
      'sunset-sprint-20260715',
    );
    expect(eventDetailPath({id: uuid, slug: 'sunset-sprint-20260715'})).toBe(
      '/event/sunset-sprint-20260715',
    );
    expect(
      eventDetailPath({id: uuid, slug: 'sunset-sprint-20260715'}, {results: true}),
    ).toBe('/event/sunset-sprint-20260715/results');
    expect(eventDetailPath({id: uuid, slug: '  '})).toBe(`/event/${uuid}`);
    expect(eventDetailPath({id: uuid, slug: 'летний-круиз-20260818'})).toBe(
      '/event/летний-круиз-20260818',
    );
  });

  it('matches a route key by id or slug', () => {
    const event = {id: uuid, slug: 'sunset-sprint-20260715'};
    expect(eventMatchesRouteKey(event, uuid)).toBe(true);
    expect(eventMatchesRouteKey(event, 'sunset-sprint-20260715')).toBe(true);
    expect(eventMatchesRouteKey(event, 'other')).toBe(false);
  });

  it('detects event UUIDs without treating slugs as ids', () => {
    expect(isEventUuid(uuid)).toBe(true);
    expect(isEventUuid('sunset-sprint-20260715')).toBe(false);
    expect(isEventUuid(`${uuid}-20260715`)).toBe(false);
  });
});
