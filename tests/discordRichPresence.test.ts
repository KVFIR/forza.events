import {describe, expect, it, vi, beforeEach, afterEach} from 'vitest';
import * as eventTypes from '../src/lib/eventTypes';
import {
  buildCreateRichPresence,
  buildEventRichPresence,
  buildResultsRichPresence,
  buildRouteRichPresence,
  eventPresenceState,
  formatEventLobbyPresenceCount,
  mergeRichPresence,
  resetRichPresenceSession,
  richPresenceAssetOrigin,
  richPresenceLogoUrl,
  RICH_PRESENCE_ACTIVITY_TYPE,
  truncateRichPresenceField,
} from '../src/lib/discordRichPresence';
import type {ForzaEvent} from '../src/lib/types';

function publishedEvent(overrides: Partial<ForzaEvent> = {}): ForzaEvent {
  return {
    id: 'e1',
    title: 'Test Event',
    type: 'road',
    game: 'fh6',
    status: 'open',
    lifecycle: 'open',
    startsAt: new Date(Date.now() + 86_400_000).toISOString(),
    currentPlayers: 4,
    maxPlayers: 12,
    coverImageUrl: null,
    discordMessageId: 'msg-1',
    hostDiscordId: 'host',
    ...overrides,
  } as ForzaEvent;
}

describe('discordRichPresence', () => {
  const envOrigin = import.meta.env.VITE_APP_ORIGIN as string | undefined;

  beforeEach(() => {
    vi.stubEnv('VITE_APP_ORIGIN', 'https://forza.example');
    resetRichPresenceSession();
  });

  afterEach(() => {
    if (envOrigin === undefined) {
      vi.unstubAllEnvs();
    } else {
      vi.stubEnv('VITE_APP_ORIGIN', envOrigin);
    }
    resetRichPresenceSession();
  });

  it('truncates long strings', () => {
    const long = 'a'.repeat(140);
    expect(truncateRichPresenceField(long)).toHaveLength(128);
    expect(truncateRichPresenceField(long).endsWith('…')).toBe(true);
  });

  it('prefers VITE_APP_ORIGIN for asset URLs', () => {
    expect(richPresenceAssetOrigin()).toBe('https://forza.example');
    expect(richPresenceLogoUrl()).toBe('https://forza.example/logo/logo.png');
  });

  it('uses Competing activity type', () => {
    expect(RICH_PRESENCE_ACTIVITY_TYPE).toBe(5);
  });

  it('maps browse route to action-oriented details', () => {
    const activity = buildRouteRichPresence('/');
    expect(activity.details).toBe('Looking for races');
    expect(activity.state).toBe('FORZA.EVENTS');
    expect(activity.assets?.large_image).toContain('/logo/logo.png');
  });

  it('maps /create route to generic in-app (screen override owns copy)', () => {
    const activity = buildRouteRichPresence('/create');
    expect(activity.details).toBe('In FORZA.EVENTS');
  });

  it('maps profile route to generic in-app presence', () => {
    const activity = buildRouteRichPresence('/profile');
    expect(activity.details).toBe('In FORZA.EVENTS');
    expect(activity.state).toBeNull();
  });

  it('builds create presence with draft title', () => {
    const activity = buildCreateRichPresence('Night Cruise', true);
    expect(activity.details).toBe('Night Cruise');
    expect(activity.state).toBe('Preparing a race (draft)');
  });

  it('builds results presence with title, state lobby count, and party', () => {
    const activity = buildResultsRichPresence(publishedEvent({title: 'Final GP'}));
    expect(activity.details).toBe('Final GP');
    expect(activity.state).toBe('Submitting results · 4/12');
    expect(activity.party?.size).toEqual([4, 12]);
  });

  it('omits lobby count for draft events', () => {
    const draft = publishedEvent({lifecycle: 'draft', discordMessageId: ''});
    const activity = buildEventRichPresence(draft, {role: 'host'});
    expect(activity.state).toBe('Preparing a race (draft)');
    expect(activity.party).toBeNull();
  });

  it('omits lobby count when event was never published to Discord', () => {
    const unpublished = publishedEvent({lifecycle: 'open', discordMessageId: ''});
    const activity = buildEventRichPresence(unpublished, {role: 'host'});
    expect(activity.state).toBe('Hosting');
    expect(activity.party).toBeNull();
  });

  it('formats lobby count for presence', () => {
    expect(formatEventLobbyPresenceCount({currentPlayers: 4, maxPlayers: 12})).toBe('4/12');
    expect(formatEventLobbyPresenceCount({currentPlayers: 0, maxPlayers: 0})).toBe('0/12');
    expect(
      formatEventLobbyPresenceCount({currentPlayers: 18, maxPlayers: 12, groupCount: 2}),
    ).toBe('18/24');
  });

  it('builds host presence with lobby count in state and party', () => {
    const activity = buildEventRichPresence(publishedEvent({title: 'Sunset Sprint'}), {
      role: 'host',
    });
    expect(activity.details).toBe('Sunset Sprint');
    expect(activity.state).toBe('Hosting · 4/12');
    expect(activity.party?.size).toEqual([4, 12]);
    expect(activity.assets?.large_text).toBeUndefined();
    expect(activity.assets?.small_text).toBeUndefined();
  });

  it('does not repeat title in large_text after route merge', () => {
    const route = buildRouteRichPresence('/event/abc-123');
    const override = buildEventRichPresence(publishedEvent({title: 'GT4'}), {role: 'host'});
    const merged = mergeRichPresence(route, override);
    expect(merged.details).toBe('GT4');
    expect(merged.state).toBe('Hosting · 4/12');
    expect(merged.assets?.large_text).toBeUndefined();
    expect(merged.assets?.large_image).toContain('cover-road');
    expect(merged.assets?.small_text).toBeUndefined();
  });

  it('avoids duplicate FORZA.EVENTS on profile route assets', () => {
    const activity = buildRouteRichPresence('/profile');
    expect(activity.details).toBe('In FORZA.EVENTS');
    expect(activity.assets?.large_text).toBeUndefined();
  });

  it('builds joined presence as Registered with lobby count', () => {
    const activity = buildEventRichPresence(publishedEvent(), {role: 'joined'});
    expect(activity.state).toBe('Registered · 4/12');
  });

  it('shows full lobby for viewers when event is full', () => {
    const activity = buildEventRichPresence(
      publishedEvent({
        title: 'Packed Lobby',
        type: 'dirt',
        status: 'full',
        currentPlayers: 12,
      }),
      {role: 'viewing', displayStatus: 'full'},
    );
    expect(activity.state).toBe('Event full · 12/12');
  });

  it('shows lobby count for live, cancelled, and completed events', () => {
    const live = publishedEvent({
      startsAt: new Date(Date.now() - 60_000).toISOString(),
      status: 'live',
      lifecycle: 'live',
    });
    expect(
      buildEventRichPresence(live, {role: 'viewing', displayStatus: 'live'}).state,
    ).toBe('Race in progress · 4/12');

    expect(
      buildEventRichPresence(publishedEvent({lifecycle: 'cancelled'}), {role: 'host'}).state,
    ).toBe('Cancelled · 4/12');

    expect(
      buildEventRichPresence(publishedEvent({lifecycle: 'completed'}), {role: 'joined'}).state,
    ).toBe('Finished · 4/12');
  });

  it('truncates combined state and lobby count at 128 chars', () => {
    vi.spyOn(eventTypes, 'eventTypeLabelEn').mockReturnValue('A'.repeat(120));
    const activity = buildEventRichPresence(publishedEvent(), {role: 'viewing'});
    expect(activity.state).toHaveLength(128);
    expect(activity.state!.endsWith('…')).toBe(true);
    vi.restoreAllMocks();
  });

  it('prefers cancelled over hosting in eventPresenceState', () => {
    const event = publishedEvent({lifecycle: 'cancelled'});
    expect(eventPresenceState(event, 'host', 'open')).toBe('Cancelled');
  });

  it('prefers finished over registered in eventPresenceState', () => {
    const event = publishedEvent({lifecycle: 'completed'});
    expect(eventPresenceState(event, 'joined', 'ended')).toBe('Finished');
  });

  it('merges route with screen override and explicit party clear', () => {
    const route = buildRouteRichPresence('/');
    const merged = mergeRichPresence(route, {
      type: 5,
      details: 'Custom title',
      party: null,
    });
    expect(merged.details).toBe('Custom title');
    expect(merged.party).toBeNull();
  });
});
