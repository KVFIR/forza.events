import {isStaticAssetPath} from '../shared/sitePageMeta.mjs';
import {headersForOrigin} from './originHeaders.js';

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
    vary: 'User-Agent, Accept-Encoding',
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

function mimeOf(contentType) {
  return String(contentType ?? '').split(';')[0].trim().toLowerCase();
}

/** Hashed chunks: long cache only on 200 with a real asset MIME (never SPA HTML). */
export function cacheControlForProxiedPath(pathname, status = 200, contentType = '') {
  if (status !== 200) return 'no-cache';
  const mime = mimeOf(contentType);
  if (!mime || mime.includes('html')) return 'no-cache';
  if (pathname.startsWith('/assets/')) return 'public, max-age=31536000, immutable';
  if (isStaticAssetPath(pathname)) return 'public, max-age=604800';
  return 'no-cache';
}

export function varyForProxiedPath(pathname) {
  return isStaticAssetPath(pathname) ? 'Accept-Encoding' : 'User-Agent, Accept-Encoding';
}

function applyProxyHeaders(responseHeaders, pathname, status) {
  const headers = new Headers(responseHeaders);
  headers.set(
    'cache-control',
    cacheControlForProxiedPath(pathname, status, headers.get('content-type')),
  );
  headers.set('vary', varyForProxiedPath(pathname));
  return headers;
}

function gateway502() {
  return new Response('Bad gateway', {
    status: 502,
    headers: {'cache-control': 'no-cache'},
  });
}

async function fetchRailway(target, init) {
  const retry = init.method === 'GET' || init.method === 'HEAD' || !init.method;
  try {
    const response = await fetch(target, init);
    if (!retry || response.status < 502 || response.status > 504) return response;
    await response.body?.cancel?.();
  } catch {
    if (!retry) return gateway502();
  }
  try {
    return await fetch(target, init);
  } catch {
    return gateway502();
  }
}

export async function proxyToRailway(request, env, ctx) {
  const url = new URL(request.url);
  const target = `${railwayOrigin(env)}${url.pathname}${url.search}`;
  const asset = isStaticAssetPath(url.pathname);
  const method = request.method;
  const cache = typeof caches !== 'undefined' ? caches.default : undefined;
  const cacheKey = asset && method === 'GET' ? new Request(target, {method: 'GET'}) : null;

  if (cache && cacheKey) {
    const hit = await cache.match(cacheKey);
    if (
      hit &&
      hit.status === 200 &&
      !mimeOf(hit.headers.get('content-type')).includes('html')
    ) {
      return hit;
    }
  }

  const response = await fetchRailway(target, {
    method,
    headers: headersForOrigin(request.headers, {dropCookies: asset}),
    body: method === 'GET' || method === 'HEAD' ? undefined : request.body,
    redirect: 'follow',
  });
  const out = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: applyProxyHeaders(response.headers, url.pathname, response.status),
  });

  if (
    ctx &&
    cache &&
    cacheKey &&
    cacheControlForProxiedPath(url.pathname, out.status, out.headers.get('content-type')) !==
      'no-cache'
  ) {
    ctx.waitUntil(cache.put(cacheKey, out.clone()).catch(() => {}));
  }
  return out;
}
