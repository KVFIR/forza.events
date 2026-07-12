import {describe, expect, it, vi} from 'vitest';
import type {TFunction} from 'i18next';
import {buildEventDetailViewModel} from './eventDetailView';
import type {AppUser, EventParticipant, ForzaEvent} from '../../lib/types';

const t = ((key: string) => key) as TFunction;

const baseUser: AppUser = {
  discordId: 'viewer-1',
  username: 'viewer',
  xboxGamertag: 'ViewerTag',
  eventsJoined: 0,
  eventsHosted: 0,
  attendanceRate: 0,
  noShows: 0,
  hostRatingAvg: 0,
};

function baseEvent(overrides: Partial<ForzaEvent> = {}): ForzaEvent {
  return {
    id: 'ev-1',
    slug: 'ev-1',
    title: 'Test',
    type: 'road',
    status: 'open',
    lifecycle: 'open',
    startsAt: new Date(Date.now() + 86_400_000).toISOString(),
    voicePolicy: 'optional',
    maxPlayers: 12,
    currentPlayers: 1,
    maxPi: 800,
    carRuleMode: 'anything_goes',
    hostDiscordId: 'host-1',
    hostUsername: 'host',
    allowedCars: [],
    participants: [],
    tracks: [],
    rules: '',
    ...overrides,
  };
}

function participant(
  partial: Partial<EventParticipant> & Pick<EventParticipant, 'discordId'>,
): EventParticipant {
  return {
    username: partial.username ?? 'Driver',
    gamertag: partial.gamertag ?? 'GT',
    isConvoyLeader: false,
    participationSource: 'self_join',
    ...partial,
  };
}

function buildView(
  overrides: Partial<Parameters<typeof buildEventDetailViewModel>[0]> = {},
) {
  const event = overrides.event ?? baseEvent({discordMessageId: 'msg-1'});
  return buildEventDetailViewModel({
    event,
    displayEvent: overrides.displayEvent ?? event,
    displayStatus: overrides.displayStatus ?? 'open',
    user: overrides.user ?? baseUser,
    resultRows: overrides.resultRows ?? [],
    isJoined: overrides.isJoined ?? (() => false),
    isSignedIn: overrides.isSignedIn ?? true,
    isStandalone: overrides.isStandalone ?? false,
    authInitializing: overrides.authInitializing ?? false,
    joining: overrides.joining ?? false,
    leaving: overrides.leaving ?? false,
    cancelling: overrides.cancelling ?? false,
    t: overrides.t ?? t,
  });
}

describe('buildEventDetailViewModel', () => {
  it('marks non-host viewer as showParticipantActions for published events', () => {
    const view = buildView();
    expect(view.showParticipantActions).toBe(true);
    expect(view.isHost).toBe(false);
  });

  it('hides participant actions for host', () => {
    const event = baseEvent({hostDiscordId: 'viewer-1', discordMessageId: 'msg-1'});
    const view = buildView({event, displayEvent: event});
    expect(view.showParticipantActions).toBe(false);
    expect(view.isHost).toBe(true);
  });

  it('treats unpublished events as draft without participant actions', () => {
    const event = baseEvent({lifecycle: 'draft'});
    const view = buildView({event, displayEvent: event});
    expect(view.isDraft).toBe(true);
    expect(view.showParticipantActions).toBe(false);
  });

  it('shows results section from server lifecycle, not optimistic display row', () => {
    const server = baseEvent({
      discordMessageId: 'msg-1',
      lifecycle: 'completed',
      status: 'ended',
      startsAt: new Date(Date.now() - 3_600_000).toISOString(),
    });
    const display = {...server, currentPlayers: 99};
    const view = buildView({event: server, displayEvent: display});
    expect(view.showResultsSection).toBe(true);
    expect(view.showRegistrationProgress).toBe(false);
  });

  it('disables participation when viewer is convoy leader', () => {
    const event = baseEvent({
      discordMessageId: 'msg-1',
      lobbyLeaderGamertag: 'LeaderGT',
      lobbyLeaderDiscordId: 'viewer-1',
      participants: [
        participant({
          discordId: 'viewer-1',
          gamertag: 'LeaderGT',
          isConvoyLeader: true,
          participationSource: 'host_assigned',
        }),
      ],
    });
    const view = buildView({
      event,
      displayEvent: event,
      isJoined: () => true,
    });
    expect(view.isCurrentConvoyLeader).toBe(true);
    expect(view.participationDisabled).toBe(true);
  });

  it('disables join when lobby is full and viewer is not joined', () => {
    const view = buildView({displayStatus: 'full'});
    expect(view.participationDisabled).toBe(true);
  });

  it('prompts browser sign-in for guests on forza.events', () => {
    const win: {location: {hostname: string; pathname: string}; parent: unknown} = {
      location: {hostname: 'forza.events', pathname: '/event/ev-1'},
      parent: null,
    };
    win.parent = win;
    vi.stubGlobal('window', win);
    const view = buildView({isSignedIn: false, isStandalone: true});
    expect(view.needsSignInToParticipate).toBe(true);
    vi.unstubAllGlobals();
  });

  it('still prompts Activity retry when guest is in the iframe', () => {
    const view = buildView({isSignedIn: false, isStandalone: false});
    expect(view.needsSignInToParticipate).toBe(true);
  });

  it('shows Xbox hint for joined racer who is not convoy leader', () => {
    const event = baseEvent({
      discordMessageId: 'msg-1',
      lobbyLeaderGamertag: 'LeaderGT',
      lobbyLeaderDiscordId: 'leader-1',
      participants: [
        participant({discordId: 'leader-1', gamertag: 'LeaderGT', isConvoyLeader: true}),
        participant({discordId: 'viewer-1', gamertag: 'ViewerTag'}),
      ],
      currentPlayers: 2,
    });
    const view = buildView({
      event,
      displayEvent: event,
      isJoined: () => true,
    });
    expect(view.showJoinXboxHint).toBe(true);
    expect(view.convoyLeader?.gamertag).toBe('LeaderGT');
  });
});
