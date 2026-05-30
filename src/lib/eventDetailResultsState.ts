import type {EventResultRow} from './events';
import type {EventLifecycle} from './types';

export type EventDetailResultsState = {
  rows: EventResultRow[];
  loadFailed: boolean;
};

/**
 * Merge a fetch outcome into detail results state.
 * Keeps prior rows when a read returns empty but we already had data (network error or replication lag).
 */
export function mergeEventDetailResultsState(
  prev: EventDetailResultsState,
  rows: EventResultRow[],
  failed: boolean,
): EventDetailResultsState {
  let nextRows = rows;
  if (nextRows.length === 0 && prev.rows.length > 0) {
    nextRows = prev.rows;
  }
  return {rows: nextRows, loadFailed: failed && nextRows.length === 0};
}

/** One follow-up fetch when lifecycle is completed but rows are still empty. */
export function shouldRetryCompletedResultsLoad(
  lifecycle: EventLifecycle,
  rows: EventResultRow[],
  failed: boolean,
): boolean {
  return lifecycle === 'completed' && rows.length === 0 && !failed;
}
