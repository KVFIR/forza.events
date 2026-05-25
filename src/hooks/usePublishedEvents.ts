import {useCallback, useEffect, useState} from 'react';
import {useJoinedEvents} from '../context/JoinedEventsContext';
import {fetchPublishedEvents, patchEventLobby, type FetchEventsOptions} from '../lib/events';
import {isSupabaseConfigured} from '../lib/supabase';
import {usePublishedEventsLiveUpdates} from './useEventLiveUpdates';
import type {ForzaEvent} from '../lib/types';

/** Global public browse feed (frozen MVP spec). Does not wait on Discord auth. */
export function usePublishedEvents(options: FetchEventsOptions = {}) {
  const {refreshKey} = useJoinedEvents();
  const includeCompleted = options.includeCompleted ?? false;
  const [events, setEvents] = useState<ForzaEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const silentRefetch = useCallback(() => {
    void fetchPublishedEvents(undefined, {includeCompleted}).then(setEvents);
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
    if (!isSupabaseConfigured()) {
      void fetchPublishedEvents(undefined, {includeCompleted}).then((next) => {
        setEvents(next);
        setLoading(false);
      });
      return;
    }

    let cancelled = false;
    setLoading(true);

    void fetchPublishedEvents(undefined, {includeCompleted})
      .then((next) => {
        if (!cancelled) setEvents(next);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey, includeCompleted]);

  return {events, loading};
}
