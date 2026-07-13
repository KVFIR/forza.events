const ALLOWED_HEADERS =
  'authorization, x-client-info, apikey, content-type, x-discord-access-token, x-client-surface, x-analytics-dashboard-secret, x-analytics-track-secret';
const ALLOWED_METHODS = 'POST, GET, OPTIONS';

const STATIC_ORIGINS = new Set([
  'https://127.0.0.1',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5180',
  'http://127.0.0.1:5180',
]);

function loadAllowedOrigins(): Set<string> {
  const origins = new Set(STATIC_ORIGINS);
  const appOrigin = Deno.env.get('APP_ORIGIN')?.trim().replace(/\/$/, '');
  if (appOrigin) origins.add(appOrigin);
  const extra = (Deno.env.get('ALLOWED_CORS_ORIGINS') ?? '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
  for (const o of extra) origins.add(o);
  return origins;
}

let cachedOrigins: Set<string> | null = null;

function allowedOrigins(): Set<string> {
  if (!cachedOrigins) cachedOrigins = loadAllowedOrigins();
  return cachedOrigins;
}

/** Discord Activity iframe and Discord client embed origins. */
function isDiscordEmbedOrigin(origin: string): boolean {
  try {
    const {hostname, protocol} = new URL(origin);
    if (protocol !== 'https:' && protocol !== 'http:') return false;
    return (
      hostname.endsWith('.discordsays.com') ||
      hostname.endsWith('.discord.com') ||
      hostname === 'discord.com'
    );
  } catch {
    return false;
  }
}

export function isAllowedCorsOrigin(origin: string | null): boolean {
  if (!origin) return false;
  const normalized = origin.replace(/\/$/, '');
  if (allowedOrigins().has(normalized)) return true;
  return isDiscordEmbedOrigin(normalized);
}

export function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin');
  const base: Record<string, string> = {
    'Access-Control-Allow-Headers': ALLOWED_HEADERS,
    'Access-Control-Allow-Methods': ALLOWED_METHODS,
    Vary: 'Origin',
  };

  if (origin && isAllowedCorsOrigin(origin)) {
    return {
      ...base,
      'Access-Control-Allow-Origin': origin,
    };
  }

  // Non-browser or same-origin proxy without Origin — do not use wildcard.
  return base;
}

export function jsonResponse(body: unknown, status: number, req: Request): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {...corsHeadersFor(req), 'Content-Type': 'application/json'},
  });
}

export function optionsResponse(req: Request): Response {
  const headers = corsHeadersFor(req);
  if (!headers['Access-Control-Allow-Origin']) {
    return new Response(null, {status: 403, headers});
  }
  return new Response(null, {status: 204, headers});
}

export function clientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}
