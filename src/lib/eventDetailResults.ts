import {
  fetchEventResults,
  isEventSuccessfullyCompleted,
  shouldShowEventResults,
  type EventResultRow,
} from './events';
import type {ForzaEvent} from './types';

export type LoadEventResultsOutcome = {
  rows: EventResultRow[];
  failed: boolean;
};

export type LoadEventResultsOptions = {
  /** Bypass embedded `publishedResults` (retry / replication lag). */
  forceNetwork?: boolean;
};

/** Fetch result rows when the event lifecycle allows showing the results section. */
export async function loadResultRowsForPublishedEvent(
  eventId: string,
  event: ForzaEvent,
  options?: LoadEventResultsOptions,
): Promise<LoadEventResultsOutcome> {
  if (!shouldShowEventResults(event)) {
    return {rows: [], failed: false};
  }
  // Edge detail select already embeds event_results — skip PostgREST (Activity proxy race).
  if (!options?.forceNetwork && event.publishedResults !== undefined) {
    return {rows: event.publishedResults, failed: false};
  }
  const {rows, error} = await fetchEventResults(eventId);
  // Live / in-progress: empty or failed reads are normal — host has not submitted yet.
  // Only completed events surface a load-failed retry UI.
  const failed = error === 'fetch_failed' && isEventSuccessfullyCompleted(event);
  return {rows, failed};
}
