import {describe, expect, it} from 'vitest';
import {headersForOrigin, requestForOrigin} from '../cloudflare/originHeaders.js';

describe('headersForOrigin', () => {
  it('drops Cloudflare loop headers and sets the origin Host', () => {
    const incoming = new Headers({
      Host: 'forza.events',
      'CDN-Loop': 'cloudflare',
      'CF-Connecting-IP': '1.2.3.4',
      'CF-RAY': 'abc',
      Accept: 'application/json',
      apikey: 'anon',
    });
    const headers = headersForOrigin(incoming, {host: 'uoysqfczahqmctbrrizn.supabase.co'});
    expect(headers.get('accept')).toBe('application/json');
    expect(headers.get('apikey')).toBe('anon');
    expect(headers.get('host')).toBe('uoysqfczahqmctbrrizn.supabase.co');
    expect(headers.get('cdn-loop')).toBeNull();
    expect(headers.get('cf-ray')).toBeNull();
    expect(headers.get('upgrade')).toBeNull();
    expect(headers.get('accept-encoding')).toBeNull();
  });

  it('keeps WebSocket upgrade headers and still strips CDN-Loop', () => {
    const incoming = new Headers({
      Host: 'forza.events',
      'CDN-Loop': 'cloudflare',
      Upgrade: 'websocket',
      Connection: 'Upgrade',
      'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
      'Sec-WebSocket-Version': '13',
    });
    const headers = headersForOrigin(incoming, {
      host: 'example.supabase.co',
      websocket: true,
    });
    expect(headers.get('upgrade')).toBe('websocket');
    expect(headers.get('connection')).toBe('Upgrade');
    expect(headers.get('sec-websocket-key')).toBe('dGhlIHNhbXBsZSBub25jZQ==');
    expect(headers.get('host')).toBe('example.supabase.co');
    expect(headers.get('cdn-loop')).toBeNull();
  });

  it('strips Accept-Encoding on HTTP so Cache API stores identity', () => {
    const incoming = new Headers({'Accept-Encoding': 'gzip, br'});
    expect(headersForOrigin(incoming).get('accept-encoding')).toBeNull();
    expect(
      headersForOrigin(incoming, {websocket: true}).get('accept-encoding'),
    ).toBe('gzip, br');
  });

  it('drops cookies when asked', () => {
    const incoming = new Headers({
      Cookie: 'session=1',
      Authorization: 'Bearer x',
      Accept: '*/*',
    });
    const headers = headersForOrigin(incoming, {dropCookies: true});
    expect(headers.get('accept')).toBe('*/*');
    expect(headers.get('cookie')).toBeNull();
    expect(headers.get('authorization')).toBeNull();
  });

  it('requestForOrigin mutates the clone instead of replacing it', () => {
    const incoming = new Request('https://forza.events/supabase/rest/v1/events', {
      headers: {Host: 'forza.events', 'CDN-Loop': 'cloudflare', apikey: 'anon'},
    });
    const forwarded = requestForOrigin(incoming, 'https://example.supabase.co/rest/v1/events', {
      host: 'example.supabase.co',
    });
    expect(forwarded.headers.get('apikey')).toBe('anon');
    expect(forwarded.headers.get('host')).toBe('example.supabase.co');
    expect(forwarded.headers.get('cdn-loop')).toBeNull();
    expect(forwarded.headers.get('upgrade')).toBeNull();
  });
});
