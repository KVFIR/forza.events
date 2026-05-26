import {useCallback, useEffect, useRef, useState} from 'react';
import {useAuth} from '../context/AuthContext';
import {useJoinedEvents} from '../context/JoinedEventsContext';
import {
  fetchHostDraftEvents,
  type HostDraftsLoadError,
} from '../lib/events';
import {applyDevLoadingDelay} from '../lib/devLoadingDelay';
import type {ForzaEvent} from '../lib/types';

export function useHostDrafts() {
  const {getAccessToken, isSignedIn} = useAuth();
  const {refreshKey} = useJoinedEvents();
  const [drafts, setDrafts] = useState<ForzaEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<HostDraftsLoadError | null>(null);
  const loadedOnceRef = useRef(false);

  const runFetch = useCallback(() => {
    const token = getAccessToken();
    if (!isSignedIn || !token) {
      setDrafts([]);
      setLoadError(null);
      return Promise.resolve();
    }

    setIsLoading(true);
    return applyDevLoadingDelay()
      .then(() => fetchHostDraftEvents(token))
      .then(({events, error}) => {
        setDrafts(events);
        setLoadError(error);
      })
      .finally(() => {
        loadedOnceRef.current = true;
        setIsLoading(false);
      });
  }, [getAccessToken, isSignedIn]);

  const refetch = useCallback(() => {
    void runFetch();
  }, [runFetch]);

  useEffect(() => {
    const token = getAccessToken();
    if (!isSignedIn || !token) {
      setDrafts([]);
      setLoadError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    if (!loadedOnceRef.current) setIsLoading(true);

    void applyDevLoadingDelay()
      .then(() => fetchHostDraftEvents(token))
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
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey, isSignedIn, getAccessToken]);

  return {drafts, isLoading, loadError, refetch};
}
