import {useMemo} from 'react';
import {useAuth} from '../context/AuthContext';
import {useJoinedEvents} from '../context/JoinedEventsContext';
import {filterMyEvents, sortMyEventsList, type MyEventsScope} from '../lib/eventList';
import {usePublishedEvents} from './usePublishedEvents';

export function useMyEventsCatalog(scope: MyEventsScope = 'all') {
  const {user, loading: authLoading} = useAuth();
  const {isJoined} = useJoinedEvents();
  const {events, loading: eventsLoading} = usePublishedEvents({includeCompleted: true});

  const allMine = useMemo(
    () => sortMyEventsList(filterMyEvents(events, user, 'all', isJoined)),
    [events, user, isJoined],
  );

  const filtered = useMemo(
    () => sortMyEventsList(filterMyEvents(events, user, scope, isJoined)),
    [events, user, scope, isJoined],
  );

  const active = useMemo(() => allMine.filter((e) => e.status !== 'ended'), [allMine]);
  const completed = useMemo(() => allMine.filter((e) => e.status === 'ended'), [allMine]);

  return {filtered, allMine, active, completed, loading: authLoading || eventsLoading};
}
