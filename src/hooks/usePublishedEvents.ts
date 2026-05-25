import {useEffect, useState} from 'react';
import {useAuth} from '../context/AuthContext';
import {useJoinedEvents} from '../context/JoinedEventsContext';
import {fetchPublishedEvents, type FetchEventsOptions} from '../lib/events';
import type {ForzaEvent} from '../lib/types';

/** Global public browse feed (frozen MVP spec). */
export function usePublishedEvents(options: FetchEventsOptions = {}) {
  const {loading: authLoading} = useAuth();
  const {refreshKey} = useJoinedEvents();
  const includeCompleted = options.includeCompleted ?? false;
  const [events, setEvents] = useState<ForzaEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    void fetchPublishedEvents(undefined, {includeCompleted})
      .then(setEvents)
      .finally(() => setLoading(false));
  }, [authLoading, refreshKey, includeCompleted]);

  return {events, loading: authLoading || loading};
}
