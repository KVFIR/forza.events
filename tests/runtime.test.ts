import {describe, expect, it, vi, afterEach} from 'vitest';
import {
  isBrowserWebHost,
  isPublicBrowserPath,
  shouldRequireBrowserSignIn,
  shouldShowDiscordOnlyGate,
  supportsBrowserOAuth,
} from '../src/lib/runtime';

describe('runtime browser web hosts', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  function stubLocation(hostname: string, pathname = '/') {
    const win: {location: {hostname: string; pathname: string}; parent: unknown} = {
      location: {hostname, pathname},
      parent: null,
    };
    win.parent = win;
    vi.stubGlobal('window', win);
  }

  it('treats forza.events as a browser web host', () => {
    stubLocation('forza.events');
    expect(isBrowserWebHost()).toBe(true);
    expect(supportsBrowserOAuth()).toBe(true);
    expect(shouldShowDiscordOnlyGate()).toBe(false);
    expect(shouldRequireBrowserSignIn()).toBe(true);
  });

  it('requires browser sign-in on localhost and forza.events', () => {
    stubLocation('localhost');
    expect(isBrowserWebHost()).toBe(true);
    expect(shouldRequireBrowserSignIn()).toBe(true);

    stubLocation('forza.events');
    expect(shouldRequireBrowserSignIn()).toBe(true);
  });

  it('shows Discord-only gate on unsupported standalone hosts', () => {
    stubLocation('forzaevents.up.railway.app');
    expect(isBrowserWebHost()).toBe(false);
    expect(shouldShowDiscordOnlyGate()).toBe(true);
  });

  it('matches APP_ORIGIN hostname at build time', () => {
    vi.stubEnv('VITE_APP_ORIGIN', 'https://forza.events');
    stubLocation('forza.events');
    expect(isBrowserWebHost()).toBe(true);
  });

  it('allows only auth callback and legal paths without sign-in', () => {
    stubLocation('forza.events');
    expect(isPublicBrowserPath('/auth/callback')).toBe(true);
    expect(isPublicBrowserPath('/terms')).toBe(true);
    expect(isPublicBrowserPath('/privacy')).toBe(true);
    expect(isPublicBrowserPath('/')).toBe(false);
    expect(isPublicBrowserPath('/event/abc-123')).toBe(false);
    expect(isPublicBrowserPath('/event/abc-123/results')).toBe(false);
  });
});
