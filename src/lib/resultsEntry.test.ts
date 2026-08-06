import {describe, expect, it} from 'vitest';
import {buildResultSubmitRows, inferResultsDisplayLayout} from './eventResults';
import {
  initResultsEntry,
  isResultsEntryComplete,
  placeDriver,
  placementsForSubmit,
  setDriverOutcome,
  setResultsRankingMode,
} from './resultsEntry';

const drivers = [
  {discordId: 'a', label: 'A', groupIndex: 1},
  {discordId: 'b', label: 'B', groupIndex: 1},
  {discordId: 'c', label: 'C', groupIndex: 2},
  {discordId: 'd', label: 'D', groupIndex: 2},
];

describe('resultsEntry tap-to-order', () => {
  it('places finishers and completes when all assigned', () => {
    let state = initResultsEntry(drivers, 'per_group');
    expect(isResultsEntryComplete(state)).toBe(false);
    state = placeDriver(state, 'a');
    state = placeDriver(state, 'b');
    state = setDriverOutcome(state, 'c', 'dnf');
    state = setDriverOutcome(state, 'd', 'dns');
    expect(isResultsEntryComplete(state)).toBe(true);
    expect(placementsForSubmit(state)).toEqual([
      {discordId: 'a', groupIndex: 1, dnf: false, dns: false},
      {discordId: 'b', groupIndex: 1, dnf: false, dns: false},
      {discordId: 'c', groupIndex: 2, dnf: true, dns: false},
      {discordId: 'd', groupIndex: 2, dnf: false, dns: true},
    ]);
  });

  it('overall mode builds a single finish order across groups', () => {
    let state = initResultsEntry(drivers, 'overall');
    state = placeDriver(state, 'c');
    state = placeDriver(state, 'a');
    state = placeDriver(state, 'd');
    state = placeDriver(state, 'b');
    const rows = buildResultSubmitRows(placementsForSubmit(state), 'overall');
    expect(rows.filter((r) => r.position != null)).toEqual([
      {discord_id: 'c', position: 1, dnf: false, dns: false, group_index: 2},
      {discord_id: 'a', position: 2, dnf: false, dns: false, group_index: 1},
      {discord_id: 'd', position: 3, dnf: false, dns: false, group_index: 2},
      {discord_id: 'b', position: 4, dnf: false, dns: false, group_index: 1},
    ]);
  });

  it('switching mode resets placements', () => {
    let state = initResultsEntry(drivers, 'per_group');
    state = placeDriver(state, 'a');
    state = setResultsRankingMode(state, 'overall');
    expect(state.overallOrder).toEqual([]);
    expect(state.mode).toBe('overall');
  });
});

describe('inferResultsDisplayLayout', () => {
  it('detects per-group when positions restart', () => {
    expect(
      inferResultsDisplayLayout([
        {position: 1, groupIndex: 1},
        {position: 1, groupIndex: 2},
      ]),
    ).toBe('per_group');
  });

  it('detects overall when positions are unique globally', () => {
    expect(
      inferResultsDisplayLayout([
        {position: 1, groupIndex: 1},
        {position: 2, groupIndex: 2},
      ]),
    ).toBe('overall');
  });
});
