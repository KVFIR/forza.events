const DEFAULT_SITE_ORIGIN = 'https://forza.events';
const DEFAULT_RAILWAY_ORIGIN = 'https://forzaevents.up.railway.app';

export function siteOrigin(env) {
  return (env.SITE_ORIGIN || DEFAULT_SITE_ORIGIN).replace(/\/$/, '');
}

export function railwayOrigin(env) {
  return (env.RAILWAY_ORIGIN || DEFAULT_RAILWAY_ORIGIN).replace(/\/$/, '');
}

export function ogResponseHeaders(maxAge) {
  return {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': `private, max-age=${maxAge}`,
    vary: 'User-Agent',
  };
}

export function xmlResponseHeaders(maxAge) {
  return {
    'content-type': 'application/xml; charset=utf-8',
    'cache-control': `public, max-age=${maxAge}`,
  };
}

export function textResponseHeaders(maxAge) {
  return {
    'content-type': 'text/plain; charset=utf-8',
    'cache-control': `public, max-age=${maxAge}`,
  };
}

export async function proxyToRailway(request, env) {
  const url = new URL(request.url);
  const target = `${railwayOrigin(env)}${url.pathname}${url.search}`;
  const response = await fetch(new Request(target, request));
  const headers = new Headers(response.headers);
  headers.set('vary', 'User-Agent');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
