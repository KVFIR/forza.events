import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useJoinedEvents} from '../context/JoinedEventsContext';
import {
  fetchPublishedEventsResult,
  patchEventLobby,
  type FetchEventsOptions,
  type PublishedEventsLoadError,
} from '../lib/events';
import {mergeOptimisticEventPatch} from '../lib/eventParticipation';
import {isBrowseFeedEvent} from '../lib/eventSpec';
import {applyDevLoadingDelay} from '../lib/devLoadingDelay';
import {usePublishedEventsLiveUpdates} from './useEventLiveUpdates';
import {useUpcomingEventsTick} from './useEventTimeTick';
import type {ForzaEvent} from '../lib/types';

async function fetchWithDevDelay(includeCompleted: boolean) {
  await applyDevLoadingDelay();
  return fetchPublishedEventsResult(undefined, {includeCompleted});
}

/** Global public browse feed (frozen MVP spec). Does not wait on Discord auth. */
export function usePublishedEvents(options: FetchEventsOptions = {}) {
  const {refreshKey, getLobbyPatch, clearLobbyPatch} = useJoinedEvents();
  const includeCompleted = options.includeCompleted ?? false;
  const [events, setEvents] = useState<ForzaEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<PublishedEventsLoadError | null>(null);
  const loadedOnceRef = useRef(false);

  const runFetch = useCallback(
    (silent: boolean) => {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      return fetchWithDevDelay(includeCompleted).then(({events: next, error}) => {
          setEvents(next);
          setLoadError(error);
        })
        .finally(() => {
          loadedOnceRef.current = true;
          setIsLoading(false);
          setIsRefreshing(false);
        });
    },
    [includeCompleted],
  );

  const refetch = useCallback(() => {
    void runFetch(loadedOnceRef.current);
  }, [runFetch]);

  const silentRefetch = useCallback(() => {
    void runFetch(true);
  }, [runFetch]);

  const onLobbyPatch = useCallback(
    (row: {
      id: string;
      current_players: number;
      max_players: number;
      group_count?: number | null;
      status: string;
    }) => {
      clearLobbyPatch(row.id);
      setEvents((prev) =>
        prev.map((event) =>
          event.id === row.id
            ? patchEventLobby(event, {
                current_players: row.current_players,
                max_players: row.max_players,
                group_count: row.group_count,
                status: row.status,
              })
            : event,
        ),
      );
    },
    [clearLobbyPatch],
  );

  usePublishedEventsLiveUpdates(includeCompleted, onLobbyPatch, silentRefetch);

  useEffect(() => {
    let cancelled = false;
    const silent = loadedOnceRef.current;

    if (!silent) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    void fetchWithDevDelay(includeCompleted).then(({events: next, error}) => {
        if (cancelled) return;
        setEvents(next);
        setLoadError(error);
      })
      .finally(() => {
        if (!cancelled) {
          loadedOnceRef.current = true;
          setIsLoading(false);
          setIsRefreshing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey, includeCompleted]);

  const eventsWithOptimistic = useMemo(
    () => events.map((event) => mergeOptimisticEventPatch(event, getLobbyPatch(event.id))),
    [events, getLobbyPatch],
  );

  const catalogTick = useUpcomingEventsTick(eventsWithOptimistic);

  const visibleEvents = useMemo(() => {
    if (includeCompleted) return eventsWithOptimistic;
    void catalogTick;
    return eventsWithOptimistic.filter(isBrowseFeedEvent);
  }, [eventsWithOptimistic, includeCompleted, catalogTick]);

  return {events: visibleEvents, isLoading, isRefreshing, loadError, refetch};
}
