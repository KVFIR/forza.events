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
  routeKey: string | undefined;
  event: ForzaEvent | undefined;
  routeState: EventDetailLocationState | null;
  refreshKey: number;
};

export function useEventDetailResults({routeKey, event, routeState, refreshKey}: Options) {
  const [resultsState, setResultsState] = useState<EventDetailResultsState>({
    rows: [],
    loadFailed: false,
  });
  const seededIdRef = useRef<string | null>(null);

  const applyLoadOutcome = useCallback((rows: EventResultRow[], failed: boolean) => {
    setResultsState((prev) => mergeEventDetailResultsState(prev, rows, failed));
  }, []);

  useEffect(() => {
    if (!routeKey) return;

    const seed = eventDetailRouteSeed(routeState, routeKey);
    if (seed?.resultRows !== undefined) {
      setResultsState({rows: seed.resultRows, loadFailed: false});
      seededIdRef.current = routeKey;
      return;
    }

    if (seededIdRef.current !== routeKey) {
      seededIdRef.current = routeKey;
      setResultsState({rows: [], loadFailed: false});
    }
  }, [routeKey, routeState]);

  useEffect(() => {
    const eventId = event?.id;
    if (!eventId || !event) return;

    let cancelled = false;

    async function load() {
      const ev = event;
      const eid = eventId;
      if (!ev || !eid) return;

      const first = await loadResultRowsForPublishedEvent(eid, ev);
      if (cancelled) return;
      applyLoadOutcome(first.rows, first.failed);

      if (!shouldRetryCompletedResultsLoad(ev.lifecycle, first.rows, first.failed)) {
        return;
      }

      const second = await loadResultRowsForPublishedEvent(eid, ev, {forceNetwork: true});
      if (cancelled) return;
      if (second.rows.length > 0) {
        applyLoadOutcome(second.rows, false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [event, refreshKey, applyLoadOutcome]);

  const retryResultsLoad = useCallback(() => {
    if (!event?.id) return;
    void loadResultRowsForPublishedEvent(event.id, event, {forceNetwork: true}).then((outcome) =>
      applyLoadOutcome(outcome.rows, outcome.failed),
    );
  }, [event, applyLoadOutcome]);

  return {
    resultRows: resultsState.rows,
    resultsLoadFailed: resultsState.loadFailed,
    retryResultsLoad,
  };
}
