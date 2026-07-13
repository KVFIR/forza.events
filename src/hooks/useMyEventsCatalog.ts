import {useMemo} from 'react';
import {useAuth} from '../context/AuthContext';
import {useJoinedEvents} from '../context/JoinedEventsContext';
import {
  buildScopedMyEventsList,
  filterMyEvents,
  resolveMyEventsCatalogLoading,
  sortHostDrafts,
  sortMyEventsList,
  type MyEventsScope,
} from '../lib/eventList';
import {isEventSuccessfullyCompleted} from '../lib/eventSpec';
import {useHostDrafts} from './useHostDrafts';
import {usePublishedEvents} from './usePublishedEvents';

export function useMyEventsCatalog(scope: MyEventsScope = 'all') {
  const {user, isSignedIn, loading: authLoading} = useAuth();
  const {isJoined} = useJoinedEvents();
  const {events, isLoading, isRefreshing, loadError, refetch} = usePublishedEvents({
    includeCompleted: true,
  });
  const {
    drafts,
    isLoading: draftsLoading,
    isRefreshing: draftsRefreshing,
    loadError: draftsLoadError,
    refetch: refetchDrafts,
  } = useHostDrafts();

  const waitsForDrafts = scope !== 'joined' && isSignedIn;
  const catalogLoading = resolveMyEventsCatalogLoading({
    scope,
    authLoading,
    publishedLoading: isLoading,
    isSignedIn,
    draftsLoading,
  });

  const sortedDrafts = useMemo(() => sortHostDrafts(drafts), [drafts]);

  const publishedAll = useMemo(
    () => sortMyEventsList(filterMyEvents(events, user, 'all', isJoined)),
    [events, user, isJoined],
  );

  const publishedFiltered = useMemo(
    () => sortMyEventsList(filterMyEvents(events, user, scope, isJoined)),
    [events, user, scope, isJoined],
  );

  const listOptions = useMemo(
    () => ({
      includeDrafts: waitsForDrafts,
      drafts: sortedDrafts,
    }),
    [waitsForDrafts, sortedDrafts],
  );

  const allMine = useMemo(() => {
    if (catalogLoading) return [];
    return buildScopedMyEventsList('all', {
      ...listOptions,
      published: publishedAll,
    });
  }, [catalogLoading, listOptions, publishedAll]);

  const filtered = useMemo(() => {
    if (catalogLoading) return [];
    return buildScopedMyEventsList(scope, {
      ...listOptions,
      published: publishedFiltered,
    });
  }, [catalogLoading, scope, listOptions, publishedFiltered]);

  const active = useMemo(() => allMine.filter((e) => e.status !== 'ended'), [allMine]);
  const completed = useMemo(
    () => allMine.filter((e) => isEventSuccessfullyCompleted(e)),
    [allMine],
  );

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
    isLoading: catalogLoading,
    isRefreshing:
      !catalogLoading && (isRefreshing || (waitsForDrafts && draftsRefreshing)),
    loadError,
    draftsLoadError,
    refetch: refetchAll,
  };
}
