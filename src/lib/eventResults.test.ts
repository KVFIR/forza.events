import {describe, expect, it} from 'vitest';
import {buildResultSubmitRows, hasFinishingPosition, sortEventResultRows} from './eventResults';

describe('buildResultSubmitRows', () => {
  it('assigns positions only to finishers', () => {
    const rows = buildResultSubmitRows([
      {discordId: 'a', dnf: false, dns: false},
      {discordId: 'b', dnf: true, dns: false},
      {discordId: 'c', dnf: false, dns: false},
    ]);

    expect(rows).toEqual([
      {discord_id: 'a', position: 1, dnf: false, dns: false, group_index: 1},
      {discord_id: 'c', position: 2, dnf: false, dns: false, group_index: 1},
      {discord_id: 'b', position: null, dnf: true, dns: false, group_index: 1},
    ]);
  });

  it('restarts positions per group and tags each row with its group_index', () => {
    const rows = buildResultSubmitRows([
      {discordId: 'a', groupIndex: 1, dnf: false, dns: false},
      {discordId: 'b', groupIndex: 2, dnf: false, dns: false},
      {discordId: 'c', groupIndex: 1, dnf: false, dns: false},
      {discordId: 'd', groupIndex: 2, dnf: true, dns: false},
    ]);

    expect(rows).toEqual([
      {discord_id: 'a', position: 1, dnf: false, dns: false, group_index: 1},
      {discord_id: 'c', position: 2, dnf: false, dns: false, group_index: 1},
      {discord_id: 'b', position: 1, dnf: false, dns: false, group_index: 2},
      {discord_id: 'd', position: null, dnf: true, dns: false, group_index: 2},
    ]);
  });
});

describe('sortEventResultRows', () => {
  it('lists finishers by position before DNF/DNS', () => {
    const sorted = sortEventResultRows([
      {position: null, dnf: true, dns: false},
      {position: 2, dnf: false, dns: false},
      {position: 1, dnf: false, dns: false},
    ]);
    expect(sorted.map((r) => r.position)).toEqual([1, 2, null]);
  });
});

describe('hasFinishingPosition', () => {
  it('is false for DNF/DNS', () => {
    expect(hasFinishingPosition({position: 3, dnf: true, dns: false})).toBe(false);
    expect(hasFinishingPosition({position: 1, dnf: false, dns: false})).toBe(true);
  });
});
