import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {cacheControlForProxiedPath, proxyToRailway, varyForProxiedPath} from '../cloudflare/railwayProxy.js';
import {headersForOrigin} from '../cloudflare/originHeaders.js';

const CADDYFILE = readFileSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../Caddyfile'),
  'utf8',
);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Caddyfile asset cache', () => {
  it('uses header match status, not a request-matcher status', () => {
    expect(CADDYFILE).toMatch(/header @assets[\s\S]*?match status 200/);
    expect(CADDYFILE).toMatch(/header @media[\s\S]*?match status 200/);
    expect(CADDYFILE).toMatch(/match status 4xx 5xx/);
    expect(CADDYFILE).not.toMatch(/status 400-599/);
    expect(CADDYFILE).not.toMatch(/@\w+ \{\s*\n\s*path[^\n]+\n\s*status /);
  });

  it('serves hashed assets without SPA fallback', () => {
    const block = CADDYFILE.match(/handle @siteFiles \{[\s\S]*?\n\t\}/)?.[0];
    expect(block).toBeTruthy();
    expect(block).toContain('file_server');
    expect(block).not.toContain('try_files');
  });
});

describe('headersForOrigin (Railway)', () => {
  it('drops Cloudflare hop-by-hop headers that 502 Railway', () => {
    const incoming = new Headers({
      Host: 'forza.events',
      'CDN-Loop': 'cloudflare',
      'CF-Connecting-IP': '1.2.3.4',
      'CF-RAY': 'abc',
      Accept: 'text/javascript',
      Cookie: 'session=1',
    });
    const headers = headersForOrigin(incoming);
    expect(headers.get('accept')).toBe('text/javascript');
    expect(headers.get('cookie')).toBe('session=1');
    expect(headers.get('host')).toBeNull();
    expect(headers.get('cdn-loop')).toBeNull();
    expect(headers.get('cf-connecting-ip')).toBeNull();
    expect(headers.get('cf-ray')).toBeNull();
    expect(headers.get('accept-encoding')).toBeNull();
  });
});

describe('proxied cache headers', () => {
  it('makes hashed Vite chunks immutable only on 200 javascript', () => {
    expect(
      cacheControlForProxiedPath('/assets/Profile-CUDHQB8e.js', 200, 'text/javascript'),
    ).toBe('public, max-age=31536000, immutable');
    expect(varyForProxiedPath('/assets/Profile-CUDHQB8e.js')).toBe('Accept-Encoding');
  });

  it('does not cache SPA HTML served as a JS chunk', () => {
    expect(
      cacheControlForProxiedPath('/assets/Profile-CUDHQB8e.js', 200, 'text/html; charset=utf-8'),
    ).toBe('no-cache');
    expect(cacheControlForProxiedPath('/assets/Profile-CUDHQB8e.js', 200)).toBe('no-cache');
  });

  it('does not cache missing or failed hashed chunks', () => {
    expect(
      cacheControlForProxiedPath('/assets/Profile-CUDHQB8e.js', 404, 'text/javascript'),
    ).toBe('no-cache');
    expect(cacheControlForProxiedPath('/assets/UserAvatar-CJZ8DIeK.js', 502, 'text/javascript')).toBe(
      'no-cache',
    );
  });

  it('keeps HTML routes no-cache so deploys pick up new chunk hashes', () => {
    expect(
      cacheControlForProxiedPath('/event/street-events-3-lb-vs-rb-20260909', 200, 'text/html'),
    ).toBe('no-cache');
    expect(varyForProxiedPath('/event/street-events-3-lb-vs-rb-20260909')).toBe(
      'User-Agent, Accept-Encoding',
    );
  });

  it('caches media 200s for a week', () => {
    expect(cacheControlForProxiedPath('/og/site.webp', 200, 'image/webp')).toBe(
      'public, max-age=604800',
    );
  });
});

describe('proxyToRailway', () => {
  it('retries a GET 502 once and caches real javascript', async () => {
    const put = vi.fn(async () => {});
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('bad', {status: 502}))
      .mockResolvedValueOnce(
        new Response('ok()', {status: 200, headers: {'content-type': 'text/javascript'}}),
      );
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('caches', {default: {match: async () => undefined, put}});

    const res = await proxyToRailway(
      new Request('https://forza.events/assets/x.js', {
        headers: {
          'CDN-Loop': 'cloudflare',
          Host: 'forza.events',
          'Accept-Encoding': 'gzip',
        },
      }),
      {RAILWAY_ORIGIN: 'https://origin.test'},
      {waitUntil: (p) => p},
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const originHeaders = fetchMock.mock.calls[0][1].headers;
    expect(originHeaders.get('cdn-loop')).toBeNull();
    expect(originHeaders.get('host')).toBeNull();
    expect(originHeaders.get('accept-encoding')).toBeNull();
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toContain('immutable');
    expect(put).toHaveBeenCalledTimes(1);
  });

  it('serves a cached javascript hit without refetching', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('caches', {
      default: {
        match: async () =>
          new Response('cached()', {
            status: 200,
            headers: {'content-type': 'text/javascript'},
          }),
        put: vi.fn(),
      },
    });

    const res = await proxyToRailway(
      new Request('https://forza.events/assets/x.js', {
        headers: {'CDN-Loop': 'cloudflare', Host: 'forza.events'},
      }),
      {RAILWAY_ORIGIN: 'https://origin.test'},
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(await res.text()).toBe('cached()');
  });

  it('ignores a cached HTML hit and refetches', async () => {
    const put = vi.fn(async () => {});
    const fetchMock = vi.fn(
      async () =>
        new Response('ok()', {status: 200, headers: {'content-type': 'text/javascript'}}),
    );
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('caches', {
      default: {
        match: async () =>
          new Response('<!doctype html>', {
            status: 200,
            headers: {'content-type': 'text/html; charset=utf-8'},
          }),
        put,
      },
    });

    const res = await proxyToRailway(
      new Request('https://forza.events/assets/x.js'),
      {RAILWAY_ORIGIN: 'https://origin.test'},
      {waitUntil: (p) => p},
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.headers.get('content-type')).toContain('javascript');
    expect(put).toHaveBeenCalledTimes(1);
  });

  it('does not edge-cache SPA HTML served as a JS chunk', async () => {
    const put = vi.fn(async () => {});
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response('<!doctype html>', {
          status: 200,
          headers: {'content-type': 'text/html; charset=utf-8'},
        }),
      ),
    );
    vi.stubGlobal('caches', {default: {match: async () => undefined, put}});

    const res = await proxyToRailway(
      new Request('https://forza.events/assets/Profile-xxx.js'),
      {RAILWAY_ORIGIN: 'https://origin.test'},
      {waitUntil: (p) => p},
    );

    expect(res.headers.get('cache-control')).toBe('no-cache');
    expect(put).not.toHaveBeenCalled();
  });

  it('does not retry POST', async () => {
    const fetchMock = vi.fn(async () => new Response('no', {status: 502}));
    vi.stubGlobal('fetch', fetchMock);

    const res = await proxyToRailway(
      new Request('https://forza.events/', {method: 'POST', body: 'x'}),
      {RAILWAY_ORIGIN: 'https://origin.test'},
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(502);
  });
});
