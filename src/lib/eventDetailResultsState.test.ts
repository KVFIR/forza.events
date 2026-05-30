import {describe, expect, it} from 'vitest';
import {
  mergeEventDetailResultsState,
  shouldRetryCompletedResultsLoad,
} from './eventDetailResultsState';

describe('mergeEventDetailResultsState', () => {
  it('replaces rows on successful fetch', () => {
    expect(
      mergeEventDetailResultsState(
        {rows: [{discordId: 'a', position: 1, dnf: false, dns: false}], loadFailed: false},
        [{discordId: 'b', position: 1, dnf: false, dns: false}],
        false,
      ),
    ).toEqual({
      rows: [{discordId: 'b', position: 1, dnf: false, dns: false}],
      loadFailed: false,
    });
  });

  it('keeps prior rows when fetch fails', () => {
    const prev = {
      rows: [{discordId: 'a', position: 1, dnf: false, dns: false}],
      loadFailed: false,
    };
    expect(mergeEventDetailResultsState(prev, [], true)).toEqual({
      rows: prev.rows,
      loadFailed: false,
    });
  });

  it('keeps prior rows when fetch succeeds empty (replication lag)', () => {
    const prev = {
      rows: [{discordId: 'a', position: 1, dnf: false, dns: false}],
      loadFailed: false,
    };
    expect(mergeEventDetailResultsState(prev, [], false)).toEqual({
      rows: prev.rows,
      loadFailed: false,
    });
  });

  it('marks loadFailed when fetch fails with no prior rows', () => {
    expect(mergeEventDetailResultsState({rows: [], loadFailed: false}, [], true)).toEqual({
      rows: [],
      loadFailed: true,
    });
  });
});

describe('shouldRetryCompletedResultsLoad', () => {
  it('retries completed events with empty successful read', () => {
    expect(shouldRetryCompletedResultsLoad('completed', [], false)).toBe(true);
  });

  it('does not retry when fetch failed', () => {
    expect(shouldRetryCompletedResultsLoad('completed', [], true)).toBe(false);
  });

  it('does not retry when rows exist', () => {
    expect(
      shouldRetryCompletedResultsLoad(
        'completed',
        [{discordId: 'a', position: 1, dnf: false, dns: false}],
        false,
      ),
    ).toBe(false);
  });
});
