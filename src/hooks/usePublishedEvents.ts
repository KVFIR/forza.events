import {useCallback, useEffect, useRef, useState} from 'react';
import {useJoinedEvents} from '../context/JoinedEventsContext';
import {
  fetchPublishedEventsResult,
  patchEventLobby,
  type FetchEventsOptions,
  type PublishedEventsLoadError,
} from '../lib/events';
import {applyDevLoadingDelay} from '../lib/devLoadingDelay';
import {usePublishedEventsLiveUpdates} from './useEventLiveUpdates';
import type {ForzaEvent} from '../lib/types';

async function fetchWithDevDelay(includeCompleted: boolean) {
  await applyDevLoadingDelay();
  return fetchPublishedEventsResult(undefined, {includeCompleted});
}

/** Global public browse feed (frozen MVP spec). Does not wait on Discord auth. */
export function usePublishedEvents(options: FetchEventsOptions = {}) {
  const {refreshKey} = useJoinedEvents();
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
    (row: {id: string; current_players: number; max_players: number; status: string}) => {
      setEvents((prev) =>
        prev.map((event) =>
          event.id === row.id
            ? patchEventLobby(event, {
                current_players: row.current_players,
                max_players: row.max_players,
                status: row.status,
              })
            : event,
        ),
      );
    },
    [],
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

  return {events, isLoading, isRefreshing, loadError, refetch};
}
