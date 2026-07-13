import {describe, expect, it} from 'vitest';
import {
  canPickAsNewGroupLeader,
  isActiveConvoyLeaderRow,
  isHostDenormalizedConvoyLeader,
  resolveActiveGroupLeaderId,
  resolveAddGroupParticipationSource,
} from '../supabase/functions/_shared/eventGroups.ts';

describe('isActiveConvoyLeaderRow', () => {
  it('is true only for active convoy leaders', () => {
    expect(isActiveConvoyLeaderRow({is_convoy_leader: true, waitlisted: false})).toBe(true);
    expect(isActiveConvoyLeaderRow({is_convoy_leader: true, waitlisted: true})).toBe(false);
    expect(isActiveConvoyLeaderRow({is_convoy_leader: false, waitlisted: false})).toBe(false);
  });
});

describe('isHostDenormalizedConvoyLeader', () => {
  it('is true when group-1 leader is the host via denormalized fields', () => {
    expect(
      isHostDenormalizedConvoyLeader({
        hostDiscordId: 'host-1',
        lobbyLeaderGamertag: 'HostGT',
        lobbyLeaderIsHost: true,
      }),
    ).toBe(true);
  });

  it('is false when host is not the denormalized leader', () => {
    expect(
      isHostDenormalizedConvoyLeader({
        hostDiscordId: 'host-1',
        lobbyLeaderGamertag: 'OtherGT',
        lobbyLeaderDiscordId: 'other-1',
        lobbyLeaderIsHost: false,
      }),
    ).toBe(false);
  });
});

describe('canPickAsNewGroupLeader', () => {
  const roster = [
    {discord_id: 'leader-1', is_convoy_leader: true, waitlisted: false},
    {discord_id: 'driver-1', is_convoy_leader: false, waitlisted: false},
    {discord_id: 'queued-1', is_convoy_leader: false, waitlisted: true},
  ];

  const hostProjection = {
    hostDiscordId: 'host-1',
    lobbyLeaderGamertag: 'HostGT',
    lobbyLeaderIsHost: true,
  };

  it('rejects active convoy leaders', () => {
    expect(canPickAsNewGroupLeader(roster, 'leader-1')).toBe(false);
  });

  it('allows active non-leaders and waitlisted racers', () => {
    expect(canPickAsNewGroupLeader(roster, 'driver-1')).toBe(true);
    expect(canPickAsNewGroupLeader(roster, 'queued-1')).toBe(true);
  });

  it('allows guild members without a roster row', () => {
    expect(canPickAsNewGroupLeader(roster, 'new-member')).toBe(true);
  });

  it('rejects host when denormalized as group-1 convoy leader without a row', () => {
    expect(canPickAsNewGroupLeader(roster, 'host-1', hostProjection)).toBe(false);
  });
});

describe('resolveActiveGroupLeaderId', () => {
  it('reads the active leader row for a group', () => {
    const roster = [
      {discord_id: 'g2-leader', group_index: 2, is_convoy_leader: true, waitlisted: false},
    ];
    expect(resolveActiveGroupLeaderId(roster, 2)).toBe('g2-leader');
  });

  it('falls back to denormalized group-1 host leader', () => {
    expect(
      resolveActiveGroupLeaderId([], 1, {
        hostDiscordId: 'host-1',
        lobbyLeaderGamertag: 'HostGT',
        lobbyLeaderIsHost: true,
      }),
    ).toBe('host-1');
  });
});

describe('resolveAddGroupParticipationSource', () => {
  it('keeps self_join for promoted racers', () => {
    expect(resolveAddGroupParticipationSource('driver-1', 'host-1', 'self_join')).toBe(
      'self_join',
    );
  });

  it('uses host_self_assigned for the host', () => {
    expect(resolveAddGroupParticipationSource('host-1', 'host-1', null)).toBe(
      'host_self_assigned',
    );
  });

  it('defaults to host_assigned for new guild picks', () => {
    expect(resolveAddGroupParticipationSource('new-1', 'host-1', null)).toBe('host_assigned');
  });
});
