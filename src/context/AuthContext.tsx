import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {isApiConfigured} from '../lib/api';
import {
  getDiscordAccessToken,
  initDiscordActivity,
  isStandaloneBrowser,
  retryDiscordActivityAuth,
  setDiscordSession,
  setResolvedUser,
} from '../lib/discord';
import {loadDiscordSession} from '../lib/discordAuth';
import {GUEST_USER} from '../lib/guestUser';
import type {AppUser} from '../lib/types';

type AuthState = {
  user: AppUser;
  /** Discord Activity auth still in progress; does not block route rendering. */
  loading: boolean;
  discordReady: boolean;
  isConfigured: boolean;
  isSignedIn: boolean;
  isStandalone: boolean;
  guildId: string | null;
  guildName: string | null;
  refreshUser: (next: AppUser) => void;
  getAccessToken: () => string | null;
  authRetrying: boolean;
  retryDiscordAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({children}: {children: ReactNode}) {
  const [user, setUser] = useState<AppUser>(GUEST_USER);
  const [loading, setLoading] = useState(true);
  const [discordReady, setDiscordReady] = useState(false);
  const [guildId, setGuildId] = useState<string | null>(null);
  const [guildName, setGuildName] = useState<string | null>(null);
  const [authRetrying, setAuthRetrying] = useState(false);

  const isConfigured = isApiConfigured();
  const isStandalone = isStandaloneBrowser();
  const accessToken = getDiscordAccessToken();
  const isSignedIn = Boolean(user.discordId && accessToken);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const result = await initDiscordActivity();
        if (cancelled) return;

        setUser(result.user);
        setDiscordReady(result.ready);
        setGuildId(result.guildId);
        setGuildName(result.guildName);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isConfigured]);

  useEffect(() => {
    const session = loadDiscordSession();
    if (!session?.accessToken || !session.user.discordId) return;
    if (user.discordId === session.user.discordId && accessToken) return;
    setDiscordSession(session.accessToken, session.user);
    setUser(session.user);
  }, [user.discordId, accessToken]);

  const refreshUser = useCallback((next: AppUser) => {
    setUser(next);
    setResolvedUser(next);
  }, []);

  const retryDiscordAuth = useCallback(async () => {
    if (authRetrying || isStandaloneBrowser() || !isApiConfigured()) return;

    setAuthRetrying(true);
    try {
      const result = await retryDiscordActivityAuth();
      if (!result) return;

      setUser(result.user);
      setDiscordReady(result.ready);
      setGuildId(result.guildId);
      setGuildName(result.guildName);

    } finally {
      setAuthRetrying(false);
    }
  }, [authRetrying]);

  const value = useMemo(
    () => ({
      user,
      loading,
      discordReady,
      isConfigured,
      isSignedIn,
      isStandalone,
      guildId,
      guildName,
      refreshUser,
      getAccessToken: getDiscordAccessToken,
      authRetrying,
      retryDiscordAuth,
    }),
    [
      user,
      loading,
      discordReady,
      isConfigured,
      isSignedIn,
      isStandalone,
      guildId,
      guildName,
      refreshUser,
      authRetrying,
      retryDiscordAuth,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useGuildContext() {
  const {guildId, guildName} = useAuth();
  return {guildId, guildName};
}
