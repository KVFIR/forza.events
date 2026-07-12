/** OAuth redirect URIs allowed for token-exchange (must match Discord Developer Portal). */
export function resolveOAuthRedirectUri(override?: string | null): string {
  const fromEnv = Deno.env.get('DISCORD_REDIRECT_URI')?.trim() ?? '';
  const allowlist = new Set<string>();

  if (fromEnv) allowlist.add(fromEnv);

  const appOrigin = Deno.env.get('APP_ORIGIN')?.trim().replace(/\/$/, '');
  if (appOrigin) {
    allowlist.add(`${appOrigin}/auth/callback`);
    try {
      const {hostname} = new URL(appOrigin);
      if (hostname.startsWith('www.')) {
        allowlist.add(`https://${hostname.slice(4)}/auth/callback`);
      } else {
        allowlist.add(`https://www.${hostname}/auth/callback`);
      }
    } catch {
      // ignore malformed APP_ORIGIN
    }
  }

  allowlist.add('https://forza.events/auth/callback');
  allowlist.add('https://www.forza.events/auth/callback');

  allowlist.add('https://127.0.0.1');
  allowlist.add('http://localhost:5173/auth/callback');
  allowlist.add('http://127.0.0.1:5173/auth/callback');
  allowlist.add('http://localhost:5180/auth/callback');
  allowlist.add('http://127.0.0.1:5180/auth/callback');

  const extra = (Deno.env.get('DISCORD_REDIRECT_URI_ALLOWLIST') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const uri of extra) allowlist.add(uri);

  const uri = override?.trim() || fromEnv;
  if (!uri || !allowlist.has(uri)) {
    throw new Error('Invalid redirect_uri');
  }
  return uri;
}
