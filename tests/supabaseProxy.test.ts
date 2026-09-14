import {afterEach, describe, expect, it, vi} from 'vitest';
import {isWebSocketUpgrade, proxySupabase} from '../cloudflare/supabaseProxy.js';
import {headersForOrigin, requestForOrigin} from '../cloudflare/originHeaders.js';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('isWebSocketUpgrade', () => {
  it('detects realtime Upgrade requests', () => {
    expect(
      isWebSocketUpgrade(
        new Request('https://forza.events/supabase/realtime/v1/websocket', {
          headers: {Upgrade: 'websocket'},
        }),
      ),
    ).toBe(true);
    expect(
      isWebSocketUpgrade(new Request('https://forza.events/supabase/rest/v1/events')),
    ).toBe(false);
  });
});

describe('realtime proxy headers', () => {
  it('forwards Upgrade to supabase.co without CDN-Loop', () => {
    const incoming = new Headers({
      Host: 'forza.events',
      'CDN-Loop': 'cloudflare',
      Upgrade: 'websocket',
      Connection: 'Upgrade',
    });
    const headers = headersForOrigin(incoming, {
      host: 'uoysqfczahqmctbrrizn.supabase.co',
      websocket: true,
    });
    expect(headers.get('upgrade')).toBe('websocket');
    expect(headers.get('host')).toBe('uoysqfczahqmctbrrizn.supabase.co');
    expect(headers.get('cdn-loop')).toBeNull();
  });

  it('clones the upgrade Request and strips CDN-Loop in place', () => {
    const incoming = new Request('https://forza.events/supabase/realtime/v1/websocket', {
      headers: {
        Host: 'forza.events',
        'CDN-Loop': 'cloudflare',
        Upgrade: 'websocket',
        Connection: 'Upgrade',
        'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
      },
    });
    const forwarded = requestForOrigin(incoming, 'https://example.supabase.co/realtime/v1/websocket', {
      host: 'example.supabase.co',
      websocket: true,
    });
    expect(forwarded).toBeInstanceOf(Request);
    expect(forwarded.url).toBe('https://example.supabase.co/realtime/v1/websocket');
    expect(forwarded.headers.get('upgrade')).toBe('websocket');
    expect(forwarded.headers.get('sec-websocket-key')).toBe('dGhlIHNhbXBsZSBub25jZQ==');
    expect(forwarded.headers.get('host')).toBe('example.supabase.co');
    expect(forwarded.headers.get('cdn-loop')).toBeNull();
  });

  it('proxySupabase fetch receives the cloned upgrade Request', async () => {
    const fetchMock = vi.fn(async () => new Response(null, {status: 200}));
    vi.stubGlobal('fetch', fetchMock);

    await proxySupabase(
      new Request('https://forza.events/supabase/realtime/v1/websocket', {
        headers: {
          Upgrade: 'websocket',
          Connection: 'Upgrade',
          'CDN-Loop': 'cloudflare',
          Host: 'forza.events',
        },
      }),
      {},
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const forwarded = fetchMock.mock.calls[0][0];
    expect(forwarded).toBeInstanceOf(Request);
    expect(String(forwarded.url)).toContain('supabase.co/realtime/v1/websocket');
    expect(forwarded.headers.get('upgrade')).toBe('websocket');
    expect(forwarded.headers.get('cdn-loop')).toBeNull();
    expect(forwarded.headers.get('host')).toBe('uoysqfczahqmctbrrizn.supabase.co');
  });
});
