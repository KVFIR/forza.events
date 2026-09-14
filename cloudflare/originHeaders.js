/** Headers that 502 when forwarded to another Cloudflare origin (Railway / Supabase). */
const LOOP_HEADERS = new Set([
  'host',
  'cdn-loop',
  'cf-connecting-ip',
  'cf-ew-via',
  'cf-ipcountry',
  'cf-ray',
  'cf-visitor',
  'cf-worker',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
  'x-real-ip',
]);

/** Hop-by-hop; drop on HTTP. Keep `upgrade` / `connection` for WebSocket proxying. */
const HTTP_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'proxy-connection',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

/**
 * Copy request headers for an origin fetch.
 * @param {Headers} requestHeaders
 * @param {{host?: string, dropCookies?: boolean, websocket?: boolean}} [opts]
 */
export function headersForOrigin(requestHeaders, {host, dropCookies = false, websocket = false} = {}) {
  const headers = new Headers();
  for (const [key, value] of requestHeaders.entries()) {
    const lower = key.toLowerCase();
    if (LOOP_HEADERS.has(lower)) continue;
    if (!websocket && HTTP_HOP_HEADERS.has(lower)) continue;
    // Cache API keys by URL only; forwarding AE would store one gzip variant for every client.
    if (!websocket && lower === 'accept-encoding') continue;
    if (dropCookies && (lower === 'cookie' || lower === 'authorization')) continue;
    headers.set(key, value);
  }
  if (host) headers.set('host', host);
  return headers;
}

/**
 * Clone `request` (keeps the Workers WebSocket upgrade) and replace headers.
 * Do not `new Request(clone, {headers})` — that can drop the upgrade handle.
 */
export function requestForOrigin(request, targetUrl, opts = {}) {
  const forwarded = new Request(targetUrl, request);
  const next = headersForOrigin(request.headers, opts);
  for (const name of [...forwarded.headers.keys()]) {
    forwarded.headers.delete(name);
  }
  for (const [key, value] of next) {
    forwarded.headers.set(key, value);
  }
  return forwarded;
}
