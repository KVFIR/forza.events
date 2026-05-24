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
import {useAuth} from './AuthContext';
import type {ForzaEvent} from '../lib/types';

type Overrides = Record<string, boolean>;

type Ctx = {
  isJoined: (event: ForzaEvent) => boolean;
  toggleJoin: (event: ForzaEvent, gamertag?: string) => Promise<void>;
  refreshKey: number;
  bumpRefresh: () => void;
};

const JoinedEventsContext = createContext<Ctx | null>(null);

export function JoinedEventsProvider({children}: {children: ReactNode}) {
  const {user, getAccessToken, isMockMode} = useAuth();
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

  const toggleJoin = useCallback(
    async (event: ForzaEvent, gamertag?: string) => {
      const currently = isJoined(event);
      const token = getAccessToken();

      if (!isMockMode && isApiConfigured() && token) {
        if (currently) {
          await leaveEvent(token, event.id);
        } else {
          const gt = gamertag ?? user.xboxGamertag;
          if (!gt) throw new Error('Gamertag required');
          await joinEvent(token, event.id, gt);
        }
        bumpRefresh();
        return;
      }

      setOverrides((prev) => ({...prev, [event.id]: !currently}));
    },
    [isJoined, getAccessToken, isMockMode, user.xboxGamertag, bumpRefresh],
  );

  const value = useMemo(
    () => ({
      isJoined,
      toggleJoin,
      refreshKey,
      bumpRefresh,
    }),
    [isJoined, toggleJoin, refreshKey, bumpRefresh],
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
