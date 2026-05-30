import {
  fetchEventResults,
  shouldShowEventResults,
  type EventResultRow,
} from './events';
import type {ForzaEvent} from './types';

export type LoadEventResultsOutcome = {
  rows: EventResultRow[];
  failed: boolean;
};

/** Fetch result rows when the event lifecycle allows showing the results section. */
export async function loadResultRowsForPublishedEvent(
  eventId: string,
  event: ForzaEvent,
): Promise<LoadEventResultsOutcome> {
  if (!shouldShowEventResults(event)) {
    return {rows: [], failed: false};
  }
  const {rows, error} = await fetchEventResults(eventId);
  return {rows, failed: error === 'fetch_failed'};
}
