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
    expect(shouldRequireBrowserSignIn()).toBe(false);
  });

  it('does not hard-gate browser sign-in on localhost or forza.events', () => {
    stubLocation('localhost');
    expect(isBrowserWebHost()).toBe(true);
    expect(shouldRequireBrowserSignIn()).toBe(false);

    stubLocation('forza.events');
    expect(shouldRequireBrowserSignIn()).toBe(false);
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

  it('allows guest showcase, auth callback, and legal paths without sign-in', () => {
    stubLocation('forza.events');
    expect(isPublicBrowserPath('/auth/callback')).toBe(true);
    expect(isPublicBrowserPath('/terms')).toBe(true);
    expect(isPublicBrowserPath('/privacy')).toBe(true);
    expect(isPublicBrowserPath('/')).toBe(true);
    expect(isPublicBrowserPath('/leaderboard')).toBe(true);
    expect(isPublicBrowserPath('/bot-installed')).toBe(true);
    expect(isPublicBrowserPath('/event/abc-123')).toBe(true);
    expect(isPublicBrowserPath('/event/abc-123/results')).toBe(true);
    expect(isPublicBrowserPath('/create')).toBe(false);
    expect(isPublicBrowserPath('/profile')).toBe(false);
    expect(isPublicBrowserPath('/my-events')).toBe(false);
  });
});
