import {describe, expect, it, vi, afterEach} from 'vitest';
import {CLIENT_SURFACE_HEADER, resolveClientSurface} from '../src/lib/clientSurface';

describe('clientSurface', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubStandalone(hostname: string, parentIsSelf = true) {
    const win: {location: {hostname: string; pathname: string}; parent: unknown} = {
      location: {hostname, pathname: '/'},
      parent: null,
    };
    win.parent = parentIsSelf ? win : {};
    vi.stubGlobal('window', win);
  }

  it('detects Discord Activity iframe', () => {
    stubStandalone('forza.events', false);
    expect(resolveClientSurface()).toBe('activity');
  });

  it('detects supported browser web host', () => {
    stubStandalone('forza.events', true);
    expect(resolveClientSurface()).toBe('browser_web');
  });

  it('detects blocked standalone host', () => {
    stubStandalone('forzaevents.up.railway.app', true);
    expect(resolveClientSurface()).toBe('browser_blocked');
  });

  it('exports header name for API calls', () => {
    expect(CLIENT_SURFACE_HEADER).toBe('x-client-surface');
  });
});
