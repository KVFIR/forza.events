import {useEffect, useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router-dom';
import {exchangeToken, isApiConfigured} from '../lib/api';
import {getDiscordRedirectUri, saveDiscordSession} from '../lib/discordAuth';
import {setDiscordSession} from '../lib/discord';
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
      setError(params.get('error_description') ?? oauthError);
      return;
    }

    if (!code) {
      setError('Missing authorization code from Discord.');
      return;
    }

    if (!isApiConfigured()) {
      setError('Supabase API is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in .env.');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const result = await exchangeToken(code, {redirectUri: getDiscordRedirectUri()});
        if (cancelled) return;
        saveDiscordSession({accessToken: result.access_token, user: result.user});
        setDiscordSession(result.access_token, result.user);
        refreshUser(result.user);
        navigate('/my-events', {replace: true});
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params, navigate]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
      {error ? (
        <>
          <p className="text-sm text-red-300/90">{error}</p>
          <TextButton type="button" tone="nav" onClick={() => navigate('/', {replace: true})}>
            Back to browse
          </TextButton>
        </>
      ) : (
        <p className="text-sm text-muted">Completing authorization…</p>
      )}
    </div>
  );
}
