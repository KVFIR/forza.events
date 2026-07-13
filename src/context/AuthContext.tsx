import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {fetchLaunchIntent, isApiConfigured} from '../lib/api';
import {track, trackAuthSuccessOnce} from '../lib/analytics';
import {
  clearDiscordAuthState,
  getDiscordAccessToken,
  initDiscordActivity,
  isStandaloneBrowser,
  retryDiscordActivityAuth,
  setDiscordSession,
  setResolvedUser,
  type InitResult,
} from '../lib/discord';
import {applyLaunchEventRedirect} from '../lib/launchRedirect';
import {clearDiscordSession, loadDiscordSession, mergeSessionUser} from '../lib/discordAuth';
import {saveAuthReturnTo} from '../lib/returnTo';
import {supportsBrowserOAuth} from '../lib/runtime';
import {SESSION_EXPIRED_EVENT} from '../lib/sessionEvents';
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
  refreshUser: (next: AppUser | ((prev: AppUser) => AppUser)) => void;
  getAccessToken: () => string | null;
  authRetrying: boolean;
  retryDiscordAuth: () => Promise<void>;
  /** Clear browser OAuth session so the user can sign in with another Discord account. */
  signOutBrowser: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({children}: {children: ReactNode}) {
  const navigate = useNavigate();
  const {pathname, search} = useLocation();
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
    setLoading(true);

    (async () => {
      let result: InitResult | undefined;
      try {
        result = await initDiscordActivity();
        if (cancelled) return;

        setUser(mergeSessionUser(result.user));
        setDiscordReady(result.ready);
        setGuildId(result.guildId);
        setGuildName(result.guildName);
      } finally {
        if (!cancelled) setLoading(false);
      }

      if (!cancelled && result) {
        void applyLaunchEventRedirect(result, {
          isConfigured,
          pathname: window.location.pathname,
          navigate,
          cancelled: () => cancelled,
          fetchIntent: fetchLaunchIntent,
        });
      }
    })();

    return () => {
      cancelled = true;
      setLoading(false);
    };
  }, [navigate, isConfigured]);

  useEffect(() => {
    if (loading || !isSignedIn) return;
    trackAuthSuccessOnce();
  }, [loading, isSignedIn]);

  useEffect(() => {
    const session = loadDiscordSession();
    if (!session?.accessToken || !session.user.discordId) return;

    if (user.discordId === session.user.discordId && accessToken) {
      const sessionTag = session.user.xboxGamertag?.trim();
      const userTag = user.xboxGamertag?.trim();
      if (sessionTag && sessionTag !== userTag) {
        const merged = {...user, xboxGamertag: sessionTag};
        setUser(merged);
        setResolvedUser(merged);
      }
      return;
    }

    setDiscordSession(session.accessToken, session.user);
    setUser(session.user);
  }, [user.discordId, user.xboxGamertag, accessToken]);

  // The API layer clears the stored session on a 401; reset in-memory auth to guest here.
  useEffect(() => {
    const onExpired = () => {
      track('session_expired', {outcome: 'error', api_code: 'UNAUTHORIZED'});
      clearDiscordAuthState();
      setUser(GUEST_USER);
      setGuildId(null);
      setGuildName(null);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  const refreshUser = useCallback((next: AppUser | ((prev: AppUser) => AppUser)) => {
    setUser((prev) => {
      const merged = typeof next === 'function' ? next(prev) : next;
      setResolvedUser(merged);
      return merged;
    });
  }, []);

  const signOutBrowser = useCallback(() => {
    if (!isStandaloneBrowser()) return;
    clearDiscordSession();
    clearDiscordAuthState();
    setUser(GUEST_USER);
    setDiscordReady(false);
    setGuildId(null);
    setGuildName(null);
    if (supportsBrowserOAuth()) {
      saveAuthReturnTo(`${pathname}${search}`);
      navigate('/sign-in', {replace: true});
    }
  }, [navigate, pathname, search]);

  const retryDiscordAuth = useCallback(async () => {
    if (authRetrying || isStandaloneBrowser() || !isApiConfigured()) return;

    setAuthRetrying(true);
    try {
      const result = await retryDiscordActivityAuth();
      if (!result) return;

      setUser(mergeSessionUser(result.user));
      setDiscordReady(result.ready);
      setGuildId(result.guildId);
      setGuildName(result.guildName);

      if (result.accessToken) {
        void applyLaunchEventRedirect(result, {
          isConfigured,
          pathname,
          navigate,
          cancelled: () => false,
          fetchIntent: fetchLaunchIntent,
        });
      }
    } finally {
      setAuthRetrying(false);
    }
  }, [authRetrying, isConfigured, navigate, pathname]);

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
      signOutBrowser,
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
      signOutBrowser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
