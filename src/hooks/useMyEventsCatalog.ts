import {useMemo} from 'react';
import {useAuth} from '../context/AuthContext';
import {useJoinedEvents} from '../context/JoinedEventsContext';
import {
  filterMyEvents,
  mergeHostDraftsFirst,
  sortHostDrafts,
  sortMyEventsList,
  type MyEventsScope,
} from '../lib/eventList';
import {useHostDrafts} from './useHostDrafts';
import {usePublishedEvents} from './usePublishedEvents';

export function useMyEventsCatalog(scope: MyEventsScope = 'all') {
  const {user} = useAuth();
  const {isJoined} = useJoinedEvents();
  const {events, isLoading, isRefreshing, loadError, refetch} = usePublishedEvents({
    includeCompleted: true,
  });
  const {
    drafts,
    isLoading: draftsLoading,
    loadError: draftsLoadError,
    refetch: refetchDrafts,
  } = useHostDrafts();

  const sortedDrafts = useMemo(() => sortHostDrafts(drafts), [drafts]);

  const publishedAll = useMemo(
    () => sortMyEventsList(filterMyEvents(events, user, 'all', isJoined)),
    [events, user, isJoined],
  );

  const publishedFiltered = useMemo(
    () => sortMyEventsList(filterMyEvents(events, user, scope, isJoined)),
    [events, user, scope, isJoined],
  );

  const allMine = useMemo(
    () => mergeHostDraftsFirst(sortedDrafts, publishedAll),
    [sortedDrafts, publishedAll],
  );

  const filtered = useMemo(() => {
    if (scope === 'joined') return publishedFiltered;
    return mergeHostDraftsFirst(sortedDrafts, publishedFiltered);
  }, [scope, sortedDrafts, publishedFiltered]);

  const active = useMemo(() => allMine.filter((e) => e.status !== 'ended'), [allMine]);
  const completed = useMemo(() => allMine.filter((e) => e.status === 'ended'), [allMine]);

  const refetchAll = () => {
    refetch();
    refetchDrafts();
  };

  return {
    filtered,
    allMine,
    drafts: sortedDrafts,
    active,
    completed,
    isLoading: isLoading || draftsLoading,
    isRefreshing,
    loadError,
    draftsLoadError,
    refetch: refetchAll,
  };
}
