import {describe, expect, it} from 'vitest';
import {buildScopedMyEventsList, resolveMyEventsCatalogLoading} from '../src/lib/eventList';
import type {ForzaEvent} from '../src/lib/types';

function event(id: string, title: string): ForzaEvent {
  return {
    id,
    title,
    type: 'road',
    status: 'draft',
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
