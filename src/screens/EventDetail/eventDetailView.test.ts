import {describe, expect, it, vi} from 'vitest';
import type {TFunction} from 'i18next';
import {userIsJoined} from '../../lib/events';
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

  it('hides registration progress after the event has started', () => {
    const event = baseEvent({
      discordMessageId: 'msg-1',
      lifecycle: 'open',
      status: 'live',
      startsAt: new Date(Date.now() - 60_000).toISOString(),
    });
    const view = buildView({event, displayEvent: event});
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
    expect(view.showConvoyLeaderXboxHint).toBe(true);
    expect(view.showJoinXboxHint).toBe(false);
  });

  it('routes a fresh join to the waitlist when every group is full', () => {
    const participants = Array.from({length: 12}, (_, i) =>
      participant({discordId: `d${i}`, gamertag: `GT${i}`}),
    );
    const event = baseEvent({
      discordMessageId: 'msg-1',
      participants,
      currentPlayers: 12,
    });
    const view = buildView({event, displayEvent: event, displayStatus: 'full'});
    // A full lobby no longer blocks joining — it queues the racer instead.
    expect(view.participationDisabled).toBe(false);
    expect(view.willWaitlist).toBe(true);
  });

  it('enables leave-waitlist for a queued viewer (not counted as joined)', () => {
    const event = baseEvent({
      discordMessageId: 'msg-1',
      participants: [
        participant({discordId: 'viewer-1', gamertag: 'ViewerTag', waitlisted: true}),
      ],
    });
    const view = buildView({event, displayEvent: event, isJoined: () => false});
    expect(view.onWaitlist).toBe(true);
    expect(view.joined).toBe(false);
    expect(view.participationDisabled).toBe(false);
  });

  it('offers Add group to the host when every active group is full', () => {
    const participants = Array.from({length: 12}, (_, i) =>
      participant({discordId: `d${i}`, gamertag: `GT${i}`}),
    );
    const event = baseEvent({
      hostDiscordId: 'viewer-1',
      discordMessageId: 'msg-1',
      participants,
      currentPlayers: 12,
    });
    const view = buildView({event, displayEvent: event});
    expect(view.canAddGroup).toBe(true);
    expect(view.waitlistCount).toBe(0);
  });

  it('offers Add group to the host when the lobby is full with a waitlist', () => {
    const participants = Array.from({length: 12}, (_, i) =>
      participant({discordId: `d${i}`, gamertag: `GT${i}`}),
    );
    participants.push(participant({discordId: 'q1', gamertag: 'Q1', waitlisted: true}));
    const event = baseEvent({
      hostDiscordId: 'viewer-1',
      discordMessageId: 'msg-1',
      participants,
      currentPlayers: 12,
    });
    const view = buildView({event, displayEvent: event});
    expect(view.canAddGroup).toBe(true);
    expect(view.waitlistCount).toBe(1);
  });

  it('lets the host change convoy leaders on a published event before start', () => {
    const event = baseEvent({
      hostDiscordId: 'viewer-1',
      discordMessageId: 'msg-1',
      participants: [
        participant({discordId: 'viewer-1', gamertag: 'HostGT', isConvoyLeader: true}),
      ],
    });
    const view = buildView({event, displayEvent: event});
    expect(view.canChangeGroupLeader).toBe(true);
  });

  it('blocks convoy leader changes after the event starts', () => {
    const event = baseEvent({
      hostDiscordId: 'viewer-1',
      discordMessageId: 'msg-1',
      startsAt: new Date(Date.now() - 60_000).toISOString(),
      participants: [
        participant({discordId: 'viewer-1', gamertag: 'HostGT', isConvoyLeader: true}),
      ],
    });
    const view = buildView({event, displayEvent: event});
    expect(view.canChangeGroupLeader).toBe(false);
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
    expect(view.viewerConvoyLeader?.gamertag).toBe('LeaderGT');
  });

  it('hides Xbox hint for waitlisted racers', () => {
    const event = baseEvent({
      discordMessageId: 'msg-1',
      lobbyLeaderGamertag: 'LeaderGT',
      lobbyLeaderDiscordId: 'leader-1',
      participants: [
        participant({discordId: 'leader-1', gamertag: 'LeaderGT', isConvoyLeader: true}),
        participant({discordId: 'viewer-1', gamertag: 'ViewerTag', waitlisted: true}),
      ],
      currentPlayers: 12,
    });
    const view = buildView({
      event,
      displayEvent: event,
      isJoined: () => false,
    });
    expect(view.showJoinXboxHint).toBe(false);
  });

  it('counts host_assigned convoy leader as joined but blocks leave', () => {
    const event = baseEvent({
      discordMessageId: 'msg-1',
      participants: [
        participant({
          discordId: 'viewer-1',
          gamertag: 'ViewerTag',
          isConvoyLeader: true,
          participationSource: 'host_assigned',
        }),
      ],
      currentPlayers: 1,
    });
    const view = buildView({
      event,
      displayEvent: event,
      isJoined: (e) => userIsJoined(e, baseUser),
    });
    expect(view.participationDisabled).toBe(true);
    expect(view.showConvoyLeaderXboxHint).toBe(true);
  });

  it('uses the viewer group leader for multi-group Xbox hints', () => {
    const event = baseEvent({
      discordMessageId: 'msg-1',
      groupCount: 2,
      participants: [
        participant({discordId: 'g1-leader', gamertag: 'G1', isConvoyLeader: true, groupIndex: 1}),
        participant({discordId: 'g2-leader', gamertag: 'G2', isConvoyLeader: true, groupIndex: 2}),
        participant({discordId: 'viewer-1', gamertag: 'ViewerTag', groupIndex: 2}),
      ],
      currentPlayers: 3,
    });
    const view = buildView({
      event,
      displayEvent: event,
      isJoined: () => true,
    });
    expect(view.viewerConvoyLeader?.gamertag).toBe('G2');
    expect(view.showJoinXboxHint).toBe(true);
  });

  it('shows Xbox hint for convoy leader in a multi-group lobby', () => {
    const event = baseEvent({
      discordMessageId: 'msg-1',
      groupCount: 2,
      participants: [
        participant({discordId: 'g1-leader', gamertag: 'G1', isConvoyLeader: true, groupIndex: 1}),
        participant({
          discordId: 'viewer-1',
          gamertag: 'ViewerTag',
          isConvoyLeader: true,
          groupIndex: 2,
        }),
      ],
      currentPlayers: 2,
    });
    const view = buildView({
      event,
      displayEvent: event,
      isJoined: () => false,
    });
    expect(view.showConvoyLeaderXboxHint).toBe(true);
    expect(view.showJoinXboxHint).toBe(false);
  });
});
