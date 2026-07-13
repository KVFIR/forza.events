import {describe, expect, it} from 'vitest';
import {buildScopedMyEventsList} from '../src/lib/eventList';
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
      draftsLoading: false,
      drafts: [draft],
      published: [published],
    });
    expect(list.map((e) => e.id)).toEqual(['draft-1', 'pub-1']);
  });

  it('shows published only while drafts are loading', () => {
    const list = buildScopedMyEventsList('all', {
      includeDrafts: true,
      draftsLoading: true,
      drafts: [draft],
      published: [published],
    });
    expect(list.map((e) => e.id)).toEqual(['pub-1']);
  });

  it('joined scope ignores drafts', () => {
    const list = buildScopedMyEventsList('joined', {
      includeDrafts: true,
      draftsLoading: false,
      drafts: [draft],
      published: [published],
    });
    expect(list.map((e) => e.id)).toEqual(['pub-1']);
  });
});
