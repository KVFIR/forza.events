/**
 * Transparent Supabase proxy for browser clients in regions that block *.supabase.co.
 * Deploy to route forza.events/supabase/* (see wrangler.toml).
 */
const DEFAULT_ORIGIN = 'https://uoysqfczahqmctbrrizn.supabase.co';

export async function proxySupabase(request, env) {
  const origin = (env.SUPABASE_ORIGIN || DEFAULT_ORIGIN).replace(/\/$/, '');
  const url = new URL(request.url);

  const prefix = '/supabase';
  if (!url.pathname.startsWith(prefix)) {
    return new Response('Not found', {status: 404});
  }

  const upstreamPath = url.pathname.slice(prefix.length) || '/';
  const targetUrl = `${origin}${upstreamPath}${url.search}`;

  const headers = new Headers(request.headers);
  headers.set('host', new URL(origin).host);

  if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
    return fetch(targetUrl, {headers, method: request.method});
  }

  return fetch(targetUrl, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'follow',
  });
}
