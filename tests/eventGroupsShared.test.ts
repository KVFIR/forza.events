import {describe, expect, it} from 'vitest';
import {
  canPickAsNewGroupLeader,
  canApplyGroupMovesInOrder,
  isActiveConvoyLeaderRow,
  isHostDenormalizedConvoyLeader,
  balancedGroupTargets,
  netGroupMovePlans,
  planGroupBalance,
  planGroupBalanceShuffle,
  planGroupShuffle,
  resolveActiveGroupLeaderId,
  resolveAddGroupParticipationSource,
  sortGroupMovesForApply,
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

describe('balancedGroupTargets', () => {
  it('spreads remainder to lower-numbered groups', () => {
    expect(balancedGroupTargets(5, 2)).toEqual([3, 2]);
    expect(balancedGroupTargets(20, 2)).toEqual([10, 10]);
    expect(balancedGroupTargets(20, 3)).toEqual([7, 7, 6]);
  });
});

describe('planGroupBalance', () => {
  it('returns no moves for a single group', () => {
    expect(
      planGroupBalance(
        [
          {discord_id: 'l1', group_index: 1, waitlisted: false, is_convoy_leader: true},
          {discord_id: 'd1', group_index: 1, waitlisted: false, is_convoy_leader: false},
        ],
        1,
        12,
      ),
    ).toEqual([]);
  });

  it('moves only the surplus needed for even sizes', () => {
    const rows = [
      {
        discord_id: 'l1',
        group_index: 1,
        waitlisted: false,
        is_convoy_leader: true,
        joined_at: '2026-01-01T00:00:00Z',
      },
      {
        discord_id: 'l2',
        group_index: 2,
        waitlisted: false,
        is_convoy_leader: true,
        joined_at: '2026-01-01T00:00:00Z',
      },
      ...Array.from({length: 9}, (_, i) => ({
        discord_id: `g1_${i}`,
        group_index: 1,
        waitlisted: false,
        is_convoy_leader: false,
        joined_at: `2026-01-01T01:${String(i).padStart(2, '0')}:00Z`,
      })),
      ...Array.from({length: 7}, (_, i) => ({
        discord_id: `g2_${i}`,
        group_index: 2,
        waitlisted: false,
        is_convoy_leader: false,
        joined_at: `2026-01-02T01:${String(i).padStart(2, '0')}:00Z`,
      })),
    ];
    const moves = planGroupBalance(rows, 2, 12);
    expect(moves).toHaveLength(1);
    expect(moves[0]).toEqual({discord_id: 'g1_8', from_group: 1, to_group: 2});
    expect(canApplyGroupMovesInOrder(moves, rows, 12)).toBe(true);
  });

  it('does not swap drivers when counts already match targets', () => {
    const rows = [
      {discord_id: 'l1', group_index: 1, waitlisted: false, is_convoy_leader: true},
      {discord_id: 'l2', group_index: 2, waitlisted: false, is_convoy_leader: true},
      {discord_id: 'a', group_index: 1, waitlisted: false, is_convoy_leader: false},
      {discord_id: 'b', group_index: 1, waitlisted: false, is_convoy_leader: false},
      {discord_id: 'c', group_index: 2, waitlisted: false, is_convoy_leader: false},
    ];
    expect(planGroupBalance(rows, 2, 3)).toEqual([]);
  });

  it('keeps leaders fixed and evens non-leader sizes', () => {
    const moves = planGroupBalance(
      [
        {
          discord_id: 'l1',
          group_index: 1,
          waitlisted: false,
          is_convoy_leader: true,
          joined_at: '2026-01-01T00:00:00Z',
        },
        {
          discord_id: 'l2',
          group_index: 2,
          waitlisted: false,
          is_convoy_leader: true,
          joined_at: '2026-01-01T00:00:00Z',
        },
        {
          discord_id: 'a',
          group_index: 1,
          waitlisted: false,
          is_convoy_leader: false,
          joined_at: '2026-01-01T00:01:00Z',
        },
        {
          discord_id: 'b',
          group_index: 1,
          waitlisted: false,
          is_convoy_leader: false,
          joined_at: '2026-01-01T00:02:00Z',
        },
        {
          discord_id: 'c',
          group_index: 1,
          waitlisted: false,
          is_convoy_leader: false,
          joined_at: '2026-01-01T00:03:00Z',
        },
      ],
      2,
      12,
    );
    // Start: g1=4 (L+3), g2=1 (L) → targets ~2.5 → 3 and 2
    expect(moves.every((m) => m.discord_id !== 'l1' && m.discord_id !== 'l2')).toBe(true);
    expect(moves.length).toBeGreaterThan(0);
    const to2 = moves.filter((m) => m.to_group === 2);
    expect(to2.length).toBe(1);
  });

  it('ignores waitlisted racers', () => {
    expect(
      planGroupBalance(
        [
          {discord_id: 'l1', group_index: 1, waitlisted: false, is_convoy_leader: true},
          {discord_id: 'l2', group_index: 2, waitlisted: false, is_convoy_leader: true},
          {discord_id: 'w1', group_index: 1, waitlisted: true, is_convoy_leader: false},
        ],
        2,
        12,
      ),
    ).toEqual([]);
  });

  it('is a no-op when already balanced', () => {
    expect(
      planGroupBalance(
        [
          {discord_id: 'l1', group_index: 1, waitlisted: false, is_convoy_leader: true},
          {discord_id: 'l2', group_index: 2, waitlisted: false, is_convoy_leader: true},
          {
            discord_id: 'a',
            group_index: 1,
            waitlisted: false,
            is_convoy_leader: false,
            joined_at: '2026-01-01T00:01:00Z',
          },
          {
            discord_id: 'b',
            group_index: 2,
            waitlisted: false,
            is_convoy_leader: false,
            joined_at: '2026-01-01T00:02:00Z',
          },
        ],
        2,
        12,
      ),
    ).toEqual([]);
  });
});

describe('planGroupShuffle', () => {
  it('returns no moves with fewer than two drivers', () => {
    expect(
      planGroupShuffle(
        [
          {discord_id: 'l1', group_index: 1, waitlisted: false, is_convoy_leader: true},
          {discord_id: 'l2', group_index: 2, waitlisted: false, is_convoy_leader: true},
          {discord_id: 'a', group_index: 1, waitlisted: false, is_convoy_leader: false},
        ],
        2,
        12,
        () => 0.5,
      ),
    ).toEqual([]);
  });

  it('never moves convoy leaders', () => {
    const rows = [
      {discord_id: 'l1', group_index: 1, waitlisted: false, is_convoy_leader: true},
      {discord_id: 'l2', group_index: 2, waitlisted: false, is_convoy_leader: true},
      {discord_id: 'a', group_index: 1, waitlisted: false, is_convoy_leader: false},
      {discord_id: 'b', group_index: 1, waitlisted: false, is_convoy_leader: false},
      {discord_id: 'c', group_index: 2, waitlisted: false, is_convoy_leader: false},
      {discord_id: 'd', group_index: 2, waitlisted: false, is_convoy_leader: false},
    ];
    const moves = planGroupShuffle(rows, 2, 12, () => 0.99);
    expect(moves.every((m) => m.discord_id !== 'l1' && m.discord_id !== 'l2')).toBe(true);
  });

  it('returns no moves with only one shufflable driver', () => {
    expect(
      planGroupShuffle(
        [
          {discord_id: 'l1', group_index: 1, waitlisted: false, is_convoy_leader: true},
          {discord_id: 'l2', group_index: 2, waitlisted: false, is_convoy_leader: true},
          {discord_id: 'd1', group_index: 1, waitlisted: false, is_convoy_leader: false},
        ],
        2,
        12,
      ),
    ).toEqual([]);
  });

  it('skips unsafe shuffle permutations when groups are full', () => {
    const rows = [
      {discord_id: 'l1', group_index: 1, waitlisted: false, is_convoy_leader: true},
      {discord_id: 'l2', group_index: 2, waitlisted: false, is_convoy_leader: true},
      ...Array.from({length: 11}, (_, i) => ({
        discord_id: `g1_${i}`,
        group_index: 1,
        waitlisted: false,
        is_convoy_leader: false,
      })),
      ...Array.from({length: 11}, (_, i) => ({
        discord_id: `g2_${i}`,
        group_index: 2,
        waitlisted: false,
        is_convoy_leader: false,
      })),
    ];
    expect(planGroupShuffle(rows, 2, 12, () => 0.99)).toEqual([]);
  });

  it('retries shuffle until a move is found when possible', () => {
    const rows = [
      {discord_id: 'l1', group_index: 1, waitlisted: false, is_convoy_leader: true},
      {discord_id: 'l2', group_index: 2, waitlisted: false, is_convoy_leader: true},
      {discord_id: 'a', group_index: 1, waitlisted: false, is_convoy_leader: false},
      {discord_id: 'b', group_index: 2, waitlisted: false, is_convoy_leader: false},
    ];
    const moves = planGroupShuffle(rows, 2, 12, () => 0);
    expect(moves).toHaveLength(2);
    expect(moves).toContainEqual({discord_id: 'a', from_group: 1, to_group: 2});
    expect(moves).toContainEqual({discord_id: 'b', from_group: 2, to_group: 1});
    expect(canApplyGroupMovesInOrder(moves, rows, 12)).toBe(true);
  });

  it('ignores waitlisted racers', () => {
    const rows = [
      {discord_id: 'l1', group_index: 1, waitlisted: false, is_convoy_leader: true},
      {discord_id: 'l2', group_index: 2, waitlisted: false, is_convoy_leader: true},
      {discord_id: 'a', group_index: 1, waitlisted: false, is_convoy_leader: false},
      {discord_id: 'b', group_index: 2, waitlisted: false, is_convoy_leader: false},
      {discord_id: 'w1', group_index: 1, waitlisted: true, is_convoy_leader: false},
    ];
    const moves = planGroupShuffle(rows, 2, 12, () => 0);
    expect(moves).toHaveLength(2);
    expect(moves.every((m) => m.discord_id === 'a' || m.discord_id === 'b')).toBe(true);
  });
});

describe('planGroupBalanceShuffle', () => {
  it('stages balance then shuffle and nets one notify move per racer', () => {
    const rows = [
      {discord_id: 'l1', group_index: 1, waitlisted: false, is_convoy_leader: true},
      {discord_id: 'l2', group_index: 2, waitlisted: false, is_convoy_leader: true},
      {discord_id: 'l3', group_index: 3, waitlisted: false, is_convoy_leader: true},
      ...Array.from({length: 11}, (_, i) => ({
        discord_id: `g1_${i}`,
        group_index: 1,
        waitlisted: false,
        is_convoy_leader: false,
      })),
      ...Array.from({length: 11}, (_, i) => ({
        discord_id: `g2_${i}`,
        group_index: 2,
        waitlisted: false,
        is_convoy_leader: false,
      })),
      {discord_id: 'g3_0', group_index: 3, waitlisted: false, is_convoy_leader: false},
      {discord_id: 'g3_1', group_index: 3, waitlisted: false, is_convoy_leader: false},
    ];
    const balanceOnly = planGroupBalance(rows, 3, 12);
    let seed = 1;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 0x100000000;
    };
    const staged = planGroupBalanceShuffle(rows, 3, 12, random);
    expect(balanceOnly.length).toBeGreaterThan(0);
    expect(staged.length).toBeGreaterThan(balanceOnly.length);
    expect(canApplyGroupMovesInOrder(staged, rows, 12)).toBe(true);
    expect(planGroupShuffle(rows, 3, 12)).toEqual([]);

    const notified = netGroupMovePlans(staged);
    expect(notified.length).toBeGreaterThan(0);
    expect(new Set(notified.map((m) => m.discord_id)).size).toBe(notified.length);
  });

  it('returns empty when shuffle after balance is impossible', () => {
    expect(
      planGroupBalanceShuffle(
        [
          {discord_id: 'l1', group_index: 1, waitlisted: false, is_convoy_leader: true},
          {discord_id: 'l2', group_index: 2, waitlisted: false, is_convoy_leader: true},
          {discord_id: 'a', group_index: 1, waitlisted: false, is_convoy_leader: false},
        ],
        2,
        12,
      ),
    ).toEqual([]);
  });
});

describe('sortGroupMovesForApply', () => {
  it('applies departures from fuller groups before inbound moves', () => {
    const rows = [
      {discord_id: 'a', group_index: 1, waitlisted: false},
      {discord_id: 'b', group_index: 1, waitlisted: false},
      {discord_id: 'x', group_index: 1, waitlisted: false},
      {discord_id: 'c', group_index: 2, waitlisted: false},
      {discord_id: 'y', group_index: 2, waitlisted: false},
    ];
    const moves = sortGroupMovesForApply(
      [
        {discord_id: 'c', from_group: 2, to_group: 1},
        {discord_id: 'b', from_group: 1, to_group: 2},
      ],
      rows,
      2,
    );
    expect(moves[0].discord_id).toBe('b');
    expect(canApplyGroupMovesInOrder(moves, rows, 3)).toBe(true);
  });
});
