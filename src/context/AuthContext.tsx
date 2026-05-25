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
  setResolvedUser,
  signInWithDiscord,
  signOutDiscord,
} from '../lib/discord';
import {GUEST_USER} from '../lib/guestUser';
import type {AppUser} from '../lib/types';

type AuthState = {
  user: AppUser;
  loading: boolean;
  discordReady: boolean;
  isConfigured: boolean;
  isSignedIn: boolean;
  isStandalone: boolean;
  guildId: string | null;
  guildName: string | null;
  refreshUser: (next: AppUser) => void;
  getAccessToken: () => string | null;
  signIn: () => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({children}: {children: ReactNode}) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AppUser>(GUEST_USER);
  const [loading, setLoading] = useState(true);
  const [discordReady, setDiscordReady] = useState(false);
  const [guildId, setGuildId] = useState<string | null>(null);
  const [guildName, setGuildName] = useState<string | null>(null);

  const isConfigured = isApiConfigured();
  const isStandalone = isStandaloneBrowser();
  const isSignedIn = Boolean(user.discordId && getDiscordAccessToken());

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

        if (result.ready && result.guildId && result.accessToken && isConfigured) {
          void fetchLaunchIntent(result.accessToken, result.guildId).then((eventId) => {
            if (eventId && !cancelled) {
              navigate(`/event/${eventId}`, {replace: true});
            }
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, isConfigured]);

  const refreshUser = useCallback((next: AppUser) => {
    setUser(next);
    setResolvedUser(next);
  }, []);

  const signIn = useCallback(() => {
    signInWithDiscord();
  }, []);

  const signOut = useCallback(() => {
    signOutDiscord();
    setUser(GUEST_USER);
    setDiscordReady(false);
    setGuildId(null);
    setGuildName(null);
  }, []);

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
      signIn,
      signOut,
    }),
    [user, loading, discordReady, isConfigured, isSignedIn, isStandalone, guildId, guildName, refreshUser, signIn, signOut],
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
