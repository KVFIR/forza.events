import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {joinEvent, leaveEvent, isApiConfigured} from '../lib/api';
import {userIsJoined} from '../lib/events';
import {isStandaloneBrowser} from '../lib/discord';
import {hasGamertag} from '../lib/gamertag';
import {useAuth} from './AuthContext';
import type {ForzaEvent} from '../lib/types';

type Overrides = Record<string, boolean>;

type Ctx = {
  isJoined: (event: ForzaEvent) => boolean;
  joinParticipation: (event: ForzaEvent, gamertag: string) => Promise<void>;
  leaveParticipation: (eventId: string) => Promise<void>;
  /** @deprecated Prefer joinParticipation / leaveParticipation */
  toggleJoin: (event: ForzaEvent, gamertag?: string) => Promise<void>;
  refreshKey: number;
  bumpRefresh: () => void;
};

const JoinedEventsContext = createContext<Ctx | null>(null);

export function JoinedEventsProvider({children}: {children: ReactNode}) {
  const {user, getAccessToken, isSignedIn, refreshUser} = useAuth();
  const [overrides, setOverrides] = useState<Overrides>({});
  const [refreshKey, setRefreshKey] = useState(0);

  const bumpRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const isJoined = useCallback(
    (event: ForzaEvent) => {
      const o = overrides[event.id];
      if (o !== undefined) return o;
      return userIsJoined(event, user);
    },
    [overrides, user],
  );

  const clearOverride = useCallback((eventId: string) => {
    setOverrides((prev) => {
      if (prev[eventId] === undefined) return prev;
      const next = {...prev};
      delete next[eventId];
      return next;
    });
  }, []);

  const joinParticipation = useCallback(
    async (event: ForzaEvent, gamertag: string) => {
      const token = getAccessToken();
      const gt = gamertag.trim();

      if (isSignedIn && isApiConfigured() && token) {
        if (!hasGamertag(gt)) throw new Error('Xbox gamertag is required to join events.');
        setOverrides((prev) => ({...prev, [event.id]: true}));
        try {
          await joinEvent(token, event.id, gt);
          refreshUser((prev) => ({...prev, xboxGamertag: gt}));
          bumpRefresh();
        } catch (err) {
          clearOverride(event.id);
          bumpRefresh();
          throw err;
        }
        return;
      }

      if (!isStandaloneBrowser()) {
        throw new Error('Sign in with Discord to join or leave events.');
      }

      setOverrides((prev) => ({...prev, [event.id]: true}));
    },
    [getAccessToken, isSignedIn, bumpRefresh, refreshUser, clearOverride],
  );

  const leaveParticipation = useCallback(
    async (eventId: string) => {
      const token = getAccessToken();

      if (isSignedIn && isApiConfigured() && token) {
        setOverrides((prev) => ({...prev, [eventId]: false}));
        try {
          await leaveEvent(token, eventId);
          bumpRefresh();
        } catch (err) {
          clearOverride(eventId);
          bumpRefresh();
          throw err;
        }
        return;
      }

      if (!isStandaloneBrowser()) {
        throw new Error('Sign in with Discord to join or leave events.');
      }

      setOverrides((prev) => ({...prev, [eventId]: false}));
    },
    [getAccessToken, isSignedIn, bumpRefresh, clearOverride],
  );

  const toggleJoin = useCallback(
    async (event: ForzaEvent, gamertag?: string) => {
      if (isJoined(event)) {
        await leaveParticipation(event.id);
        return;
      }
      const gt = (gamertag ?? user.xboxGamertag)?.trim();
      if (!hasGamertag(gt)) throw new Error('Xbox gamertag is required to join events.');
      await joinParticipation(event, gt!);
    },
    [isJoined, leaveParticipation, joinParticipation, user.xboxGamertag],
  );

  const value = useMemo(
    () => ({
      isJoined,
      joinParticipation,
      leaveParticipation,
      toggleJoin,
      refreshKey,
      bumpRefresh,
    }),
    [isJoined, joinParticipation, leaveParticipation, toggleJoin, refreshKey, bumpRefresh],
  );

  return (
    <JoinedEventsContext.Provider value={value}>{children}</JoinedEventsContext.Provider>
  );
}

export function useJoinedEvents(): Ctx {
  const ctx = useContext(JoinedEventsContext);
  if (!ctx) throw new Error('useJoinedEvents must be used within JoinedEventsProvider');
  return ctx;
}
