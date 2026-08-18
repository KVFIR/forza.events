import {useEffect, useMemo, useRef, useState} from 'react';
import {fetchEventById} from '../../lib/events';
import {eventMatchesRouteKey} from '@edge/eventPath.ts';
import {mergeOptimisticEventPatch, type EventLobbyPatch} from '../../lib/eventParticipation';
import type {ForzaEvent} from '../../lib/types';

export function useEventDetailLoad(input: {
  id: string | undefined;
  routeEvent: ForzaEvent | undefined;
  discordToken: string | null;
  refreshKey: number;
  getLobbyPatch: (eventId: string) => EventLobbyPatch | undefined;
}) {
  const {id, routeEvent, discordToken, refreshKey, getLobbyPatch} = input;
  const [event, setEvent] = useState<ForzaEvent | undefined>();
  const [loading, setLoading] = useState(true);
  const loadedForIdRef = useRef<string | null>(null);
  const fetchSeqRef = useRef(0);
  const eventRef = useRef(event);
  eventRef.current = event;

  const displayEvent = useMemo(
    () => (event ? mergeOptimisticEventPatch(event, getLobbyPatch(event.id)) : undefined),
    [event, getLobbyPatch],
  );

  useEffect(() => {
    if (!id) return;
    const seq = ++fetchSeqRef.current;
    const idChanged = loadedForIdRef.current !== id;

    if (idChanged) {
      loadedForIdRef.current = id;
      setEvent(routeEvent && eventMatchesRouteKey(routeEvent, id) ? routeEvent : undefined);
      setLoading(true);
    } else if (!eventRef.current) {
      // Token landed after a guest miss (host draft). Keep the spinner — don't flash not-found.
      setLoading(true);
    }

    void fetchEventById(id, {discordToken})
      .then((ev) => {
        if (fetchSeqRef.current !== seq) return;
        if (ev) {
          setEvent(ev);
        } else if (!routeEvent || !eventMatchesRouteKey(routeEvent, id)) {
          setEvent(undefined);
        }
      })
      .catch((err) => console.error('fetchEventById', err))
      .finally(() => {
        if (fetchSeqRef.current === seq) setLoading(false);
      });
  }, [id, refreshKey, discordToken, routeEvent]);

  return {event, setEvent, loading, displayEvent};
}
