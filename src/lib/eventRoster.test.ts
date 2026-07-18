import {describe, expect, it} from 'vitest';
import {
  buildAddGroupLeaderCandidates,
  buildChangeGroupLeaderCandidates,
  groupHasSeatForIncomingLeader,
  hostCanLeadNewGroup,
  resolveConvoyLeader,
  resolveRegisteredDrivers,
  resolveResultsRoster,
  resolveViewerConvoyLeader,
  resolveWaitlist,
  viewerIsConvoyLeader,
} from './eventRoster';
import type {EventParticipant, ForzaEvent} from './types';

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

function event(
  partial: Partial<ForzaEvent> & Pick<ForzaEvent, 'hostDiscordId'>,
): ForzaEvent {
  return {
    id: '1',
    slug: 'e',
    title: 'Race',
    type: 'road',
    game: 'fh6',
    status: 'open',
    lifecycle: 'open',
    startsAt: new Date().toISOString(),
    carRuleMode: 'anything_goes',
    maxPi: 999,
    allowedCars: [],
    voicePolicy: 'optional',
    maxPlayers: 12,
    currentPlayers: 2,
    hostUsername: 'Host',
    rules: '',
    participants: [],
    ...partial,
  };
}

describe('resolveConvoyLeader', () => {
  it('falls back to denormalized event fields when participant row is missing', () => {
    const ev = event({
      hostDiscordId: 'host-1',
      lobbyLeaderGamertag: 'HostGT',
      lobbyLeaderDiscordId: 'host-1',
      lobbyLeaderIsHost: true,
      participants: [],
      currentPlayers: 0,
    });
    const convoy = resolveConvoyLeader(ev, 'host-1');
    expect(convoy?.gamertag).toBe('HostGT');
    expect(convoy?.username).toBe('Host');
    expect(convoy?.isYou).toBe(true);
    expect(convoy?.participationSource).toBe('host_self_assigned');
  });

  it('reads leader from participant role', () => {
    const ev = event({
      hostDiscordId: 'host-1',
      participants: [
        participant({
          discordId: 'host-1',
          gamertag: 'HostGT',
          isConvoyLeader: true,
          participationSource: 'host_self_assigned',
        }),
        participant({discordId: 'p2', gamertag: 'BGT'}),
      ],
    });
    const convoy = resolveConvoyLeader(ev, 'host-1');
    expect(convoy?.discordId).toBe('host-1');
    expect(convoy?.gamertag).toBe('HostGT');
    expect(convoy?.username).toBe('Host');
  });

  it('resolves discord handle for assigned leader without duplicating gamertag', () => {
    const ev = event({
      hostDiscordId: 'host-1',
      lobbyLeaderGamertag: 'LeaderGT',
      lobbyLeaderDiscordId: 'leader-9',
      lobbyLeaderIsHost: false,
      participants: [
        participant({
          discordId: 'leader-9',
          username: 'leader_handle',
          gamertag: 'LeaderGT',
        }),
      ],
    });
    const convoy = resolveConvoyLeader(ev, 'viewer');
    expect(convoy?.username).toBe('leader_handle');
  });
});

describe('resolveRegisteredDrivers', () => {
  it('excludes convoy leader from driver grid', () => {
    const participants = [
      participant({
        discordId: 'leader-9',
        gamertag: 'LeaderGT',
        isConvoyLeader: true,
        participationSource: 'host_assigned',
      }),
      participant({discordId: 'p2', gamertag: 'BGT'}),
    ];
    expect(resolveRegisteredDrivers(participants).map((p) => p.discordId)).toEqual(['p2']);
  });

  it('orders by joinedAt oldest first', () => {
    const participants = [
      participant({
        discordId: 'p2',
        gamertag: 'B',
        joinedAt: '2030-02-02T00:00:00Z',
      }),
      participant({
        discordId: 'p1',
        gamertag: 'A',
        joinedAt: '2030-01-01T00:00:00Z',
      }),
    ];
    expect(resolveRegisteredDrivers(participants).map((p) => p.discordId)).toEqual(['p1', 'p2']);
  });
});

describe('resolveResultsRoster', () => {
  it('returns all participants once', () => {
    const participants = [
      participant({
        discordId: 'host-1',
        gamertag: 'HostGT',
        isConvoyLeader: true,
        participationSource: 'host_self_assigned',
      }),
      participant({discordId: 'p2', gamertag: 'BGT'}),
    ];
    const roster = resolveResultsRoster(event({hostDiscordId: 'host-1', participants}));
    expect(roster.map((p) => p.discordId)).toEqual(['host-1', 'p2']);
  });

  it('includes non-host leader assigned before self join', () => {
    const participants = [
      participant({
        discordId: 'leader-9',
        gamertag: 'LeaderGT',
        isConvoyLeader: true,
        participationSource: 'host_assigned',
      }),
      participant({discordId: 'p2', gamertag: 'BGT'}),
    ];
    const roster = resolveResultsRoster(event({hostDiscordId: 'host-1', participants}));
    expect(roster.map((p) => p.discordId)).toEqual(['leader-9', 'p2']);
  });

  it('excludes waitlisted racers', () => {
    const participants = [
      participant({discordId: 'p2', gamertag: 'BGT'}),
      participant({discordId: 'q1', gamertag: 'Q1', waitlisted: true}),
    ];
    const roster = resolveResultsRoster(event({hostDiscordId: 'host-1', participants}));
    expect(roster.map((p) => p.discordId)).toEqual(['p2']);
  });
});

describe('resolveWaitlist', () => {
  it('orders by joinedAt oldest first', () => {
    const list = resolveWaitlist([
      participant({discordId: 'q2', gamertag: 'Q2', waitlisted: true, joinedAt: '2030-02-02T00:00:00Z'}),
      participant({discordId: 'q1', gamertag: 'Q1', waitlisted: true, joinedAt: '2030-01-01T00:00:00Z'}),
    ]);
    expect(list.map((p) => p.discordId)).toEqual(['q1', 'q2']);
  });
});

describe('viewer convoy leader helpers', () => {
  it('detects convoy leaders in any group', () => {
    const participants = [
      participant({discordId: 'g1-leader', gamertag: 'G1', isConvoyLeader: true, groupIndex: 1}),
      participant({
        discordId: 'viewer-1',
        gamertag: 'V1',
        isConvoyLeader: true,
        groupIndex: 2,
      }),
    ];
    const ev = event({hostDiscordId: 'host-1', groupCount: 2, participants});
    expect(viewerIsConvoyLeader(ev, 'viewer-1')).toBe(true);
    expect(viewerIsConvoyLeader(ev, 'g1-leader')).toBe(true);
    expect(viewerIsConvoyLeader(ev, 'nobody')).toBe(false);
  });

  it('resolves the viewer group leader for Xbox hints', () => {
    const participants = [
      participant({discordId: 'g1-leader', gamertag: 'G1', isConvoyLeader: true, groupIndex: 1}),
      participant({discordId: 'g2-leader', gamertag: 'G2', isConvoyLeader: true, groupIndex: 2}),
      participant({discordId: 'viewer-1', gamertag: 'V1', groupIndex: 2}),
    ];
    const ev = event({hostDiscordId: 'host-1', groupCount: 2, participants});
    expect(resolveViewerConvoyLeader(ev, 'viewer-1')?.gamertag).toBe('G2');
    expect(resolveViewerConvoyLeader(ev, 'viewer-1')?.isYou).toBe(false);
  });

  it('returns null for waitlisted viewers', () => {
    const participants = [
      participant({discordId: 'g1-leader', gamertag: 'G1', isConvoyLeader: true, groupIndex: 1}),
      participant({discordId: 'viewer-1', gamertag: 'V1', waitlisted: true}),
    ];
    const ev = event({hostDiscordId: 'host-1', participants});
    expect(resolveViewerConvoyLeader(ev, 'viewer-1')).toBeNull();
  });
});

describe('buildAddGroupLeaderCandidates', () => {
  it('includes waitlist, active non-leaders, and host when host is not a convoy leader', () => {
    const ev = event({
      hostDiscordId: 'host-1',
      hostUsername: 'HostUser',
      participants: [
        participant({
          discordId: 'g1-leader',
          gamertag: 'L1',
          isConvoyLeader: true,
          groupIndex: 1,
        }),
        participant({discordId: 'driver-1', gamertag: 'D1', groupIndex: 1}),
        participant({discordId: 'queued-1', gamertag: 'Q1', waitlisted: true}),
      ],
    });
    const ids = buildAddGroupLeaderCandidates(ev, resolveWaitlist(ev.participants)).map(
      (c) => c.discordId,
    );
    expect(ids).toEqual(['queued-1', 'driver-1', 'host-1']);
    expect(ids).not.toContain('g1-leader');
  });

  it('omits host when they already lead a group', () => {
    const ev = event({
      hostDiscordId: 'host-1',
      participants: [
        participant({
          discordId: 'host-1',
          gamertag: 'HostGT',
          isConvoyLeader: true,
          participationSource: 'host_self_assigned',
        }),
      ],
    });
    expect(hostCanLeadNewGroup(ev)).toBe(false);
    expect(buildAddGroupLeaderCandidates(ev, []).map((c) => c.discordId)).toEqual([]);
  });

  it('omits host when denormalized as group-1 convoy leader without a row', () => {
    const ev = event({
      hostDiscordId: 'host-1',
      lobbyLeaderGamertag: 'HostGT',
      lobbyLeaderIsHost: true,
      participants: [],
    });
    expect(hostCanLeadNewGroup(ev)).toBe(false);
    expect(buildAddGroupLeaderCandidates(ev, []).map((c) => c.discordId)).toEqual([]);
  });
});

describe('groupHasSeatForIncomingLeader', () => {
  it('is false when group is full and the current leader will stay as a driver', () => {
    const drivers = Array.from({length: 11}, (_, i) =>
      participant({discordId: `d${i}`, gamertag: `GT${i}`, groupIndex: 1}),
    );
    const ev = event({
      hostDiscordId: 'host-1',
      participants: [
        participant({
          discordId: 'leader-1',
          gamertag: 'Leader',
          isConvoyLeader: true,
          groupIndex: 1,
          participationSource: 'self_join',
        }),
        ...drivers,
      ],
    });
    expect(groupHasSeatForIncomingLeader(ev, 1)).toBe(false);
  });

  it('is true when a host-assigned leader row will be removed', () => {
    const drivers = Array.from({length: 11}, (_, i) =>
      participant({discordId: `d${i}`, gamertag: `GT${i}`, groupIndex: 1}),
    );
    const ev = event({
      hostDiscordId: 'host-1',
      participants: [
        participant({
          discordId: 'leader-1',
          gamertag: 'Leader',
          isConvoyLeader: true,
          groupIndex: 1,
          participationSource: 'host_assigned',
        }),
        ...drivers,
      ],
    });
    expect(groupHasSeatForIncomingLeader(ev, 1)).toBe(true);
  });
});

describe('buildChangeGroupLeaderCandidates', () => {
  it('drops waitlist when the group has no seat for an incoming leader', () => {
    const drivers = Array.from({length: 11}, (_, i) =>
      participant({discordId: `d${i}`, gamertag: `GT${i}`, groupIndex: 1}),
    );
    const ev = event({
      hostDiscordId: 'host-1',
      participants: [
        participant({
          discordId: 'leader-1',
          gamertag: 'Leader',
          isConvoyLeader: true,
          groupIndex: 1,
          participationSource: 'self_join',
        }),
        ...drivers,
        participant({discordId: 'queued-1', gamertag: 'Q1', waitlisted: true}),
      ],
    });
    const ids = buildChangeGroupLeaderCandidates(
      ev,
      resolveWaitlist(ev.participants),
      1,
    ).map((c) => c.discordId);
    expect(ids).not.toContain('queued-1');
    expect(ids).toContain('d0');
  });
});
