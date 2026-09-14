/**
 * Transparent Supabase proxy for browser clients in regions that block *.supabase.co.
 * Deploy to route forza.events/supabase/* (see wrangler.toml).
 */
import {headersForOrigin, requestForOrigin} from './originHeaders.js';

const DEFAULT_ORIGIN = 'https://uoysqfczahqmctbrrizn.supabase.co';

export function isWebSocketUpgrade(request) {
  return request.headers.get('Upgrade')?.toLowerCase() === 'websocket';
}

export async function proxySupabase(request, env) {
  const origin = (env.SUPABASE_ORIGIN || DEFAULT_ORIGIN).replace(/\/$/, '');
  const url = new URL(request.url);

  const prefix = '/supabase';
  if (!url.pathname.startsWith(prefix)) {
    return new Response('Not found', {status: 404});
  }

  const upstreamPath = url.pathname.slice(prefix.length) || '/';
  const targetUrl = `${origin}${upstreamPath}${url.search}`;
  const host = new URL(origin).host;

  if (isWebSocketUpgrade(request)) {
    return fetch(requestForOrigin(request, targetUrl, {host, websocket: true}));
  }

  return fetch(targetUrl, {
    method: request.method,
    headers: headersForOrigin(request.headers, {host}),
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'follow',
  });
}
