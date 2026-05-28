import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {joinEvent, leaveEvent, isApiConfigured} from '../lib/api';
import {
  patchEventAfterSelfJoin,
  patchEventAfterSelfLeave,
  toEventLobbyPatch,
  type EventLobbyPatch,
} from '../lib/eventParticipation';
import {userIsJoined} from '../lib/events';
import {isStandaloneBrowser} from '../lib/discord';
import {hasGamertag} from '../lib/gamertag';
import {useAuth} from './AuthContext';
import type {ForzaEvent} from '../lib/types';

type Overrides = Record<string, boolean>;
type LobbyPatches = Record<string, EventLobbyPatch>;

type Ctx = {
  isJoined: (event: ForzaEvent) => boolean;
  joinParticipation: (event: ForzaEvent, gamertag: string) => Promise<void>;
  leaveParticipation: (event: ForzaEvent) => Promise<void>;
  /** @deprecated Prefer joinParticipation / leaveParticipation */
  toggleJoin: (event: ForzaEvent, gamertag?: string) => Promise<void>;
  getLobbyPatch: (eventId: string) => EventLobbyPatch | undefined;
  clearLobbyPatch: (eventId: string) => void;
  refreshKey: number;
  bumpRefresh: () => void;
};

const JoinedEventsContext = createContext<Ctx | null>(null);

export function JoinedEventsProvider({children}: {children: ReactNode}) {
  const {user, getAccessToken, isSignedIn, refreshUser} = useAuth();
  const [overrides, setOverrides] = useState<Overrides>({});
  const [lobbyPatches, setLobbyPatches] = useState<LobbyPatches>({});
  const [refreshKey, setRefreshKey] = useState(0);

  const bumpRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const getLobbyPatch = useCallback(
    (eventId: string) => lobbyPatches[eventId],
    [lobbyPatches],
  );

  const clearLobbyPatch = useCallback((eventId: string) => {
    setLobbyPatches((prev) => {
      if (prev[eventId] === undefined) return prev;
      const next = {...prev};
      delete next[eventId];
      return next;
    });
  }, []);

  const setLobbyPatch = useCallback((patched: ForzaEvent) => {
    setLobbyPatches((prev) => ({...prev, [patched.id]: toEventLobbyPatch(patched)}));
  }, []);

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
        setLobbyPatch(patchEventAfterSelfJoin(event, user, gt));
        try {
          await joinEvent(token, event.id, gt);
          refreshUser((prev) => ({...prev, xboxGamertag: gt}));
          clearLobbyPatch(event.id);
          bumpRefresh();
        } catch (err) {
          clearOverride(event.id);
          clearLobbyPatch(event.id);
          bumpRefresh();
          throw err;
        }
        return;
      }

      if (!isStandaloneBrowser()) {
        throw new Error('Sign in with Discord to join or leave events.');
      }

      setOverrides((prev) => ({...prev, [event.id]: true}));
      setLobbyPatch(patchEventAfterSelfJoin(event, user, gt));
    },
    [
      getAccessToken,
      isSignedIn,
      bumpRefresh,
      refreshUser,
      clearOverride,
      clearLobbyPatch,
      setLobbyPatch,
      user,
    ],
  );

  const leaveParticipation = useCallback(
    async (event: ForzaEvent) => {
      const token = getAccessToken();

      if (isSignedIn && isApiConfigured() && token) {
        setOverrides((prev) => ({...prev, [event.id]: false}));
        setLobbyPatch(patchEventAfterSelfLeave(event, user.discordId));
        try {
          await leaveEvent(token, event.id);
          clearLobbyPatch(event.id);
          bumpRefresh();
        } catch (err) {
          clearOverride(event.id);
          clearLobbyPatch(event.id);
          bumpRefresh();
          throw err;
        }
        return;
      }

      if (!isStandaloneBrowser()) {
        throw new Error('Sign in with Discord to join or leave events.');
      }

      setOverrides((prev) => ({...prev, [event.id]: false}));
      setLobbyPatch(patchEventAfterSelfLeave(event, user.discordId));
    },
    [
      getAccessToken,
      isSignedIn,
      bumpRefresh,
      clearOverride,
      clearLobbyPatch,
      setLobbyPatch,
      user.discordId,
    ],
  );

  const toggleJoin = useCallback(
    async (event: ForzaEvent, gamertag?: string) => {
      if (isJoined(event)) {
        await leaveParticipation(event);
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
      getLobbyPatch,
      clearLobbyPatch,
      refreshKey,
      bumpRefresh,
    }),
    [
      isJoined,
      joinParticipation,
      leaveParticipation,
      toggleJoin,
      getLobbyPatch,
      clearLobbyPatch,
      refreshKey,
      bumpRefresh,
    ],
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
