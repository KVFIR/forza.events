import type {EventResultRow, EventResultsFetchOutcome} from './events';
import {sanitizeReferrer} from './returnTo';
import type {ForzaEvent} from './types';

/** `location.state` for `/event/:id` (seeded after host submit). */
export type EventDetailLocationState = {
  event?: ForzaEvent;
  /** Set when returning from submit with a successful results read. */
  resultRows?: EventResultRow[];
  /** Referrer path for back navigation (e.g. `/my-events`). */
  from?: string;
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

/** Route state when opening the host results screen. */
export type EventResultsLocationState = {
  from?: string;
};

export function buildEventDetailLocationState(
  partial: EventDetailLocationState = {},
  from?: string,
): EventDetailLocationState {
  const referrer = sanitizeReferrer(from ?? partial.from);
  if (!referrer) {
    if (!partial.from) return partial;
    const rest = {...partial};
    delete rest.from;
    return rest;
  }
  return {...partial, from: referrer};
}

/** After host submit — omit `resultRows` when PostgREST read failed so detail refetches. */
export function buildEventDetailNavigateStateAfterSubmit(
  event: ForzaEvent,
  outcome: EventResultsFetchOutcome,
  from?: string,
): EventDetailLocationState {
  const base: EventDetailLocationState =
    outcome.error === 'fetch_failed' ? {event} : {event, resultRows: outcome.rows};
  return buildEventDetailLocationState(base, from);
}
