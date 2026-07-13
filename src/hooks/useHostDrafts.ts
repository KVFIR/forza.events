import {useCallback, useEffect, useRef, useState} from 'react';
import {useAuth} from '../context/AuthContext';
import {useJoinedEvents} from '../context/JoinedEventsContext';
import {
  fetchHostDraftEvents,
  type HostDraftsLoadError,
} from '../lib/events';
import {applyDevLoadingDelay} from '../lib/devLoadingDelay';
import type {ForzaEvent} from '../lib/types';

async function fetchWithDevDelay(token: string) {
  await applyDevLoadingDelay();
  return fetchHostDraftEvents(token);
}

export function useHostDrafts() {
  const {getAccessToken, isSignedIn} = useAuth();
  const {refreshKey} = useJoinedEvents();
  const [drafts, setDrafts] = useState<ForzaEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<HostDraftsLoadError | null>(null);
  const loadedOnceRef = useRef(false);

  const runFetch = useCallback(
    (silent: boolean) => {
      const token = getAccessToken();
      if (!isSignedIn || !token) {
        setDrafts([]);
        setLoadError(null);
        setIsLoading(false);
        setIsRefreshing(false);
        return Promise.resolve();
      }

      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      return fetchWithDevDelay(token)
        .then(({events, error}) => {
          setDrafts(events);
          setLoadError(error);
        })
        .finally(() => {
          loadedOnceRef.current = true;
          setIsLoading(false);
          setIsRefreshing(false);
        });
    },
    [getAccessToken, isSignedIn],
  );

  const refetch = useCallback(() => {
    void runFetch(loadedOnceRef.current);
  }, [runFetch]);

  useEffect(() => {
    const token = getAccessToken();
    if (!isSignedIn || !token) {
      setDrafts([]);
      setLoadError(null);
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    let cancelled = false;
    const silent = loadedOnceRef.current;
    if (!silent) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    void fetchWithDevDelay(token)
      .then(({events, error}) => {
        if (!cancelled) {
          setDrafts(events);
          setLoadError(error);
        }
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
  }, [refreshKey, isSignedIn, getAccessToken]);

  return {drafts, isLoading, isRefreshing, loadError, refetch};
}
