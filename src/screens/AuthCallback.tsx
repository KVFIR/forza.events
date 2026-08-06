import {useEffect, useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {exchangeTokenOnce, isApiConfigured} from '../lib/api';
import {track, trackAuthSuccessOnce} from '../lib/analytics';
import {
  expiresAtFromExpiresIn,
  getDiscordRedirectUri,
  saveDiscordSession,
} from '../lib/discordAuth';
import {setDiscordSession} from '../lib/discord';
import {clearAuthReturnTo, consumeAuthReturnTo} from '../lib/returnTo';
import {useAuth} from '../context/AuthContext';
import {TextButton} from '../components/ui/TextButton';

export function AuthCallback() {
  const navigate = useNavigate();
  const {refreshUser} = useAuth();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = params.get('code');
    const oauthError = params.get('error');

    if (oauthError) {
      clearAuthReturnTo();
      track('auth_failed', {
        outcome: 'error',
        api_code: oauthError,
        meta: {source: 'oauth_callback'},
      });
      setError(params.get('error_description') ?? oauthError);
      return;
    }

    if (!code) {
      clearAuthReturnTo();
      track('auth_failed', {
        outcome: 'error',
        api_code: 'MISSING_OAUTH_CODE',
        meta: {source: 'oauth_callback'},
      });
      setError('Missing authorization code from Discord.');
      return;
    }

    if (!isApiConfigured()) {
      clearAuthReturnTo();
      setError('Supabase API is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in .env.');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const result = await exchangeTokenOnce(code, {redirectUri: getDiscordRedirectUri()});
        if (cancelled) return;
        saveDiscordSession({
          accessToken: result.access_token,
          user: result.user,
          ...(result.refresh_token
            ? {refreshToken: result.refresh_token}
            : {}),
          ...(typeof result.expires_in === 'number'
            ? {expiresAt: expiresAtFromExpiresIn(result.expires_in)}
            : {}),
        });
        setDiscordSession(result.access_token, result.user);
        refreshUser(result.user);
        trackAuthSuccessOnce();
        navigate(consumeAuthReturnTo('/'), {replace: true});
      } catch (e) {
        if (!cancelled) {
          clearAuthReturnTo();
          setError(String(e));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params, navigate, refreshUser]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
      {error ? (
        <>
          <p className="text-sm text-red-300/90">{error}</p>
          <TextButton
            type="button"
            tone="nav"
            onClick={() => {
              clearAuthReturnTo();
              navigate('/', {replace: true});
            }}
          >
            Back to browse
          </TextButton>
        </>
      ) : (
        <p className="text-sm text-muted">Completing authorization…</p>
      )}
    </div>
  );
}
