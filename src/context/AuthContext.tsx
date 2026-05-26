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
  retryDiscordActivityAuth,
  setDiscordSession,
  setResolvedUser,
  type InitResult,
} from '../lib/discord';
import {hasLaunchRedirectHint, resolveLaunchEventTarget} from '../lib/launchRedirect';
import {loadDiscordSession} from '../lib/discordAuth';
import {GUEST_USER} from '../lib/guestUser';
import type {AppUser} from '../lib/types';

type AuthState = {
  user: AppUser;
  loading: boolean;
  /** Shown on the boot screen while `loading` is true. */
  bootMessage: string;
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

async function navigateToLaunchTarget(
  result: InitResult,
  isConfigured: boolean,
  navigate: (path: string, options: {replace: boolean}) => void,
  cancelled: () => boolean,
): Promise<void> {
  if (!isConfigured || !hasLaunchRedirectHint(result)) return;

  const target = await resolveLaunchEventTarget(result, fetchLaunchIntent);
  if (target && !cancelled()) {
    navigate(`/event/${target}`, {replace: true});
  }
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({children}: {children: ReactNode}) {
  const navigate = useNavigate();
  const [user, setUser] = useState<AppUser>(GUEST_USER);
  const [loading, setLoading] = useState(true);
  const [discordReady, setDiscordReady] = useState(false);
  const [guildId, setGuildId] = useState<string | null>(null);
  const [guildName, setGuildName] = useState<string | null>(null);
  const [authRetrying, setAuthRetrying] = useState(false);
  const [bootMessage, setBootMessage] = useState(() =>
    isStandaloneBrowser() ? 'Loading' : 'Connecting',
  );

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

        if (!cancelled && hasLaunchRedirectHint(result)) {
          setBootMessage('Opening your event');
        }

        await navigateToLaunchTarget(result, isConfigured, navigate, () => cancelled);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, isConfigured]);

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

      if (result.accessToken) {
        setBootMessage(
          hasLaunchRedirectHint(result) ? 'Opening your event' : 'Connecting',
        );
        await navigateToLaunchTarget(result, isConfigured, navigate, () => false);
      }
    } finally {
      setAuthRetrying(false);
    }
  }, [authRetrying, isConfigured, navigate]);

  const value = useMemo(
    () => ({
      user,
      loading,
      bootMessage,
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
      bootMessage,
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
