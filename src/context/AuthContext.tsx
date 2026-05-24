import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {useNavigate} from 'react-router-dom';
import {fetchLaunchIntent, isApiConfigured} from '../lib/api';
import {
  getDiscordAccessToken,
  initDiscordActivity,
  isStandaloneBrowser,
} from '../lib/discord';
import {MOCK_USER} from '../lib/mockData';
import type {AppUser} from '../lib/types';

type AuthState = {
  user: AppUser;
  loading: boolean;
  discordReady: boolean;
  isMockMode: boolean;
  guildId: string | null;
  guildName: string | null;
  refreshUser: (next: AppUser) => void;
  getAccessToken: () => string | null;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({children}: {children: ReactNode}) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AppUser>(MOCK_USER);
  const [loading, setLoading] = useState(true);
  const [discordReady, setDiscordReady] = useState(false);
  const [guildId, setGuildId] = useState<string | null>(null);
  const [guildName, setGuildName] = useState<string | null>(null);

  const isMockMode = isStandaloneBrowser() || !isApiConfigured();

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

        if (result.ready && result.guildId && result.accessToken && isApiConfigured()) {
          const eventId = await fetchLaunchIntent(result.accessToken, result.guildId);
          if (eventId && !cancelled) {
            navigate(`/event/${eventId}`, {replace: true});
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const refreshUser = useCallback((next: AppUser) => {
    setUser(next);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      discordReady,
      isMockMode,
      guildId,
      guildName,
      refreshUser,
      getAccessToken: getDiscordAccessToken,
    }),
    [user, loading, discordReady, isMockMode, guildId, guildName, refreshUser],
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
