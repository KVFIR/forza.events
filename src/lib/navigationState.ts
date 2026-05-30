import type {EventResultRow, EventResultsFetchOutcome} from './events';
import type {ForzaEvent} from './types';

/** `location.state` for `/event/:id` (seeded after host submit). */
export type EventDetailLocationState = {
  event?: ForzaEvent;
  /** Set when returning from submit with a successful results read. */
  resultRows?: EventResultRow[];
};

export function eventDetailRouteSeed(
  state: EventDetailLocationState | null | undefined,
  eventId: string,
): {event: ForzaEvent; resultRows?: EventResultRow[]} | null {
  if (!state?.event || state.event.id !== eventId) return null;
  return {
    event: state.event,
    ...(state.resultRows !== undefined ? {resultRows: state.resultRows} : {}),
  };
}

/** After host submit — omit `resultRows` when PostgREST read failed so detail refetches. */
export function buildEventDetailNavigateStateAfterSubmit(
  event: ForzaEvent,
  outcome: EventResultsFetchOutcome,
): EventDetailLocationState {
  if (outcome.error === 'fetch_failed') {
    return {event};
  }
  return {event, resultRows: outcome.rows};
}
