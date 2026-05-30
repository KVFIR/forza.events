import type {EventResultsFetchOutcome} from './events';
import {canSubmitEventResults} from './eventSpec';
import type {AppUser, ForzaEvent} from './types';

/** Known row count from DB, or `null` when the results read failed. */
export function savedCountFromResultsFetch(
  outcome: EventResultsFetchOutcome,
): number | null {
  return outcome.error === 'fetch_failed' ? null : outcome.rows.length;
}

/**
 * When to redirect away from the host results entry screen.
 * @param savedCount — rows already in DB; `null` when the results read failed (host may still submit).
 */
export function shouldLeaveResultsScreen(
  loaded: ForzaEvent,
  savedCount: number | null,
  viewer: AppUser,
): boolean {
  if (!canSubmitEventResults(loaded, viewer)) return true;
  if (savedCount !== null && savedCount > 0) return true;
  return false;
}
