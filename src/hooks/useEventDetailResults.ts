import {useCallback, useEffect, useRef, useState} from 'react';
import {loadResultRowsForPublishedEvent} from '../lib/eventDetailResults';
import {
  mergeEventDetailResultsState,
  shouldRetryCompletedResultsLoad,
  type EventDetailResultsState,
} from '../lib/eventDetailResultsState';
import type {EventResultRow} from '../lib/events';
import {eventDetailRouteSeed, type EventDetailLocationState} from '../lib/navigationState';
import type {ForzaEvent} from '../lib/types';

type Options = {
  eventId: string | undefined;
  event: ForzaEvent | undefined;
  routeState: EventDetailLocationState | null;
  refreshKey: number;
};

export function useEventDetailResults({eventId, event, routeState, refreshKey}: Options) {
  const [resultsState, setResultsState] = useState<EventDetailResultsState>({
    rows: [],
    loadFailed: false,
  });
  const seededIdRef = useRef<string | null>(null);

  const applyLoadOutcome = useCallback((rows: EventResultRow[], failed: boolean) => {
    setResultsState((prev) => mergeEventDetailResultsState(prev, rows, failed));
  }, []);

  useEffect(() => {
    if (!eventId) return;

    const seed = eventDetailRouteSeed(routeState, eventId);
    if (seed?.resultRows !== undefined) {
      setResultsState({rows: seed.resultRows, loadFailed: false});
      seededIdRef.current = eventId;
      return;
    }

    if (seededIdRef.current !== eventId) {
      seededIdRef.current = eventId;
      setResultsState({rows: [], loadFailed: false});
    }
  }, [eventId, routeState]);

  useEffect(() => {
    if (!eventId || !event) return;

    let cancelled = false;

    async function load() {
      const ev = event;
      const eid = eventId;
      if (!ev || !eid) return;

      if (ev.publishedResults !== undefined) {
        applyLoadOutcome(ev.publishedResults, false);
      }

      const first = await loadResultRowsForPublishedEvent(eid, ev);
      if (cancelled) return;
      applyLoadOutcome(first.rows, first.failed);

      if (!shouldRetryCompletedResultsLoad(ev.lifecycle, first.rows, first.failed)) {
        return;
      }

      const second = await loadResultRowsForPublishedEvent(eid, ev);
      if (cancelled) return;
      if (second.rows.length > 0) {
        applyLoadOutcome(second.rows, false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [eventId, event, refreshKey, applyLoadOutcome]);

  const retryResultsLoad = useCallback(() => {
    if (!eventId || !event) return;
    void loadResultRowsForPublishedEvent(eventId, event).then((outcome) =>
      applyLoadOutcome(outcome.rows, outcome.failed),
    );
  }, [eventId, event, applyLoadOutcome]);

  return {
    resultRows: resultsState.rows,
    resultsLoadFailed: resultsState.loadFailed,
    retryResultsLoad,
  };
}
