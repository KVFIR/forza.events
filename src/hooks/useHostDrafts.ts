import {useCallback, useEffect, useRef, useState} from 'react';
import {useAuth} from '../context/AuthContext';
import {useJoinedEvents} from '../context/JoinedEventsContext';
import {fetchHostDraftEvents} from '../lib/events';
import {applyDevLoadingDelay} from '../lib/devLoadingDelay';
import type {ForzaEvent} from '../lib/types';

export function useHostDrafts() {
  const {getAccessToken, isSignedIn} = useAuth();
  const {refreshKey} = useJoinedEvents();
  const [drafts, setDrafts] = useState<ForzaEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const loadedOnceRef = useRef(false);

  const refetch = useCallback(() => {
    const token = getAccessToken();
    if (!isSignedIn || !token) {
      setDrafts([]);
      return Promise.resolve();
    }

    setIsLoading(true);
    return applyDevLoadingDelay()
      .then(() => fetchHostDraftEvents(token))
      .then(setDrafts)
      .finally(() => {
        loadedOnceRef.current = true;
        setIsLoading(false);
      });
  }, [getAccessToken, isSignedIn]);

  useEffect(() => {
    const token = getAccessToken();
    if (!isSignedIn || !token) {
      setDrafts([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    if (!loadedOnceRef.current) setIsLoading(true);

    void applyDevLoadingDelay()
      .then(() => fetchHostDraftEvents(token))
      .then((next) => {
        if (!cancelled) setDrafts(next);
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

  return {drafts, isLoading, refetch};
}
