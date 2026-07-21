import {describe, expect, it} from 'vitest';
import {
  ELO_DEFAULT,
  MIN_RATED_DRIVERS,
  computePairwiseElo,
  effectiveK,
  expectedScore,
  isProvisional,
  orderRatedDrivers,
  planRatedGroupOrders,
  type PlayerRatingState,
} from '@edge/rating.ts';

function state(id: string, rating = ELO_DEFAULT, gamesRated = 0): PlayerRatingState {
  return {discordId: id, rating, gamesRated};
}

describe('rating helpers', () => {
  it('expectedScore is symmetric', () => {
    const e = expectedScore(1000, 1200);
    expect(expectedScore(1200, 1000)).toBeCloseTo(1 - e, 10);
  });

  it('effectiveK shrinks with games', () => {
    expect(effectiveK(0)).toBe(32);
    expect(effectiveK(3)).toBeCloseTo(32 / 2, 5);
    expect(effectiveK(15)).toBeLessThan(effectiveK(3));
  });

  it('provisional until 5 games', () => {
    expect(isProvisional(0)).toBe(true);
    expect(isProvisional(4)).toBe(true);
    expect(isProvisional(5)).toBe(false);
  });
});

describe('driverRatingFromRow', () => {
  it('is null until first rated game', async () => {
    const {driverRatingFromRow} = await import('@edge/driverRatingPayload.ts');
    expect(driverRatingFromRow(null)).toBeNull();
    expect(driverRatingFromRow({rating: 1000, games_rated: 0})).toBeNull();
    expect(driverRatingFromRow({rating: 1012, games_rated: 1})).toEqual({
      rating: 1012,
      gamesRated: 1,
      provisional: true,
    });
  });
});

describe('orderRatedDrivers', () => {
  it('orders finishers then DNFs; skips DNS', () => {
    expect(
      orderRatedDrivers([
        {discord_id: 'd', position: null, dnf: true},
        {discord_id: 'c', position: 2},
        {discord_id: 'a', position: 1},
        {discord_id: 'b', position: null, dns: true},
        {discord_id: 'e', position: null, dnf: true},
      ]),
    ).toEqual(['a', 'c', 'd', 'e']);
  });
});

describe('planRatedGroupOrders', () => {
  it('rates each group separately and skips small groups', () => {
    const plans = planRatedGroupOrders([
      {discord_id: 'a1', position: 1, group_index: 1},
      {discord_id: 'a2', position: 2, group_index: 1},
      {discord_id: 'a3', position: 3, group_index: 1},
      {discord_id: 'a4', position: 4, group_index: 1},
      {discord_id: 'b1', position: 1, group_index: 2},
      {discord_id: 'b2', position: 2, group_index: 2},
      {discord_id: 'b3', position: 3, group_index: 2},
    ]);
    expect(plans).toEqual([['a1', 'a2', 'a3', 'a4']]);
  });

  it('includes every group with enough rated drivers', () => {
    const plans = planRatedGroupOrders([
      {discord_id: 'a1', position: 1, group_index: 1},
      {discord_id: 'a2', position: 2, group_index: 1},
      {discord_id: 'a3', position: 3, group_index: 1},
      {discord_id: 'a4', position: 4, group_index: 1},
      {discord_id: 'b1', position: 1, group_index: 2},
      {discord_id: 'b2', position: 2, group_index: 2},
      {discord_id: 'b3', position: 3, group_index: 2},
      {discord_id: 'b4', position: null, dnf: true, group_index: 2},
    ]);
    expect(plans).toEqual([
      ['a1', 'a2', 'a3', 'a4'],
      ['b1', 'b2', 'b3', 'b4'],
    ]);
  });
});

describe('computePairwiseElo', () => {
  it('skips below minimum field', () => {
    const ids = ['a', 'b', 'c'];
    const map = new Map(ids.map((id) => [id, state(id)]));
    expect(computePairwiseElo(ids, map)).toEqual([]);
    expect(ids.length).toBeLessThan(MIN_RATED_DRIVERS);
  });

  it('winner gains and last loses when equal ratings', () => {
    const ids = ['p1', 'p2', 'p3', 'p4'];
    const map = new Map(ids.map((id) => [id, state(id)]));
    const deltas = computePairwiseElo(ids, map);
    expect(deltas).toHaveLength(4);
    const byId = Object.fromEntries(deltas.map((d) => [d.discordId, d]));
    expect(byId.p1!.delta).toBeGreaterThan(0);
    expect(byId.p4!.delta).toBeLessThan(0);
    expect(byId.p1!.ratingAfter).toBe(byId.p1!.ratingBefore + byId.p1!.delta);
  });

  it('is deterministic for fixed inputs', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const map = new Map([
      ['a', state('a', 1100, 10)],
      ['b', state('b', 1000, 2)],
      ['c', state('c', 950, 0)],
      ['d', state('d', 1050, 5)],
    ]);
    const once = computePairwiseElo(ids, map);
    const twice = computePairwiseElo(ids, map);
    expect(twice).toEqual(once);
    expect(once.map((d) => d.delta)).toEqual([3, 4, -1, -7]);
  });
});
