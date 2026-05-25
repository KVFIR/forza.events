import {useCallback, useEffect, useState} from 'react';
import {useJoinedEvents} from '../context/JoinedEventsContext';
import {
  fetchPublishedEventsResult,
  patchEventLobby,
  type FetchEventsOptions,
  type PublishedEventsLoadError,
} from '../lib/events';
import {usePublishedEventsLiveUpdates} from './useEventLiveUpdates';
import type {ForzaEvent} from '../lib/types';

/** Global public browse feed (frozen MVP spec). Does not wait on Discord auth. */
export function usePublishedEvents(options: FetchEventsOptions = {}) {
  const {refreshKey} = useJoinedEvents();
  const includeCompleted = options.includeCompleted ?? false;
  const [events, setEvents] = useState<ForzaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<PublishedEventsLoadError | null>(null);

  const silentRefetch = useCallback(() => {
    void fetchPublishedEventsResult(undefined, {includeCompleted}).then(({events: next, error}) => {
      setEvents(next);
      setLoadError(error);
    });
  }, [includeCompleted]);

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
    setLoading(true);

    void fetchPublishedEventsResult(undefined, {includeCompleted})
      .then(({events: next, error}) => {
        if (cancelled) return;
        setEvents(next);
        setLoadError(error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey, includeCompleted]);

  return {events, loading, loadError};
}
