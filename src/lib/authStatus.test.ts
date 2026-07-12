import {describe, expect, it} from 'vitest';
import i18n from '../i18n';
import {resolveAuthStatus} from './authStatus';

describe('resolveAuthStatus', () => {
  it('shows setup required when Supabase is not configured', () => {
    const status = resolveAuthStatus({
      isConfigured: false,
      loading: false,
      isSignedIn: false,
      isStandalone: true,
      supportsBrowserOAuth: true,
      isLocalDev: true,
    });
    expect(status.label).toBe(i18n.t('auth.status.setupRequired'));
    expect(status.tone).toBe('warning');
    expect(status.browserSignIn).toBeUndefined();
    expect(status.retryable).toBeUndefined();
  });

  it('shows Local when signed in on localhost', () => {
    const status = resolveAuthStatus({
      isConfigured: true,
      loading: false,
      isSignedIn: true,
      isStandalone: true,
      supportsBrowserOAuth: true,
      isLocalDev: true,
    });
    expect(status.label).toBe(i18n.t('auth.status.local'));
    expect(status.tone).toBe('online');
  });

  it('shows Online when signed in on production browser web', () => {
    const status = resolveAuthStatus({
      isConfigured: true,
      loading: false,
      isSignedIn: true,
      isStandalone: true,
      supportsBrowserOAuth: true,
      isLocalDev: false,
    });
    expect(status.label).toBe(i18n.t('auth.status.online'));
    expect(status.tone).toBe('online');
  });

  it('shows Online when signed in inside Activity', () => {
    const status = resolveAuthStatus({
      isConfigured: true,
      loading: false,
      isSignedIn: true,
      isStandalone: false,
      supportsBrowserOAuth: false,
      isLocalDev: false,
    });
    expect(status.label).toBe(i18n.t('auth.status.online'));
    expect(status.tone).toBe('online');
  });

  it('offers browser sign-in on web hosts when not signed in', () => {
    const status = resolveAuthStatus({
      isConfigured: true,
      loading: false,
      isSignedIn: false,
      isStandalone: true,
      supportsBrowserOAuth: true,
      isLocalDev: false,
    });
    expect(status.browserSignIn).toBe(true);
    expect(status.retryable).toBeUndefined();
  });

  it('shows muted not signed in on unsupported production browser without sign-in action', () => {
    const status = resolveAuthStatus({
      isConfigured: true,
      loading: false,
      isSignedIn: false,
      isStandalone: true,
      supportsBrowserOAuth: false,
      isLocalDev: false,
    });
    expect(status.label).toBe(i18n.t('auth.status.notSignedIn'));
    expect(status.tone).toBe('muted');
    expect(status.browserSignIn).toBeUndefined();
    expect(status.retryable).toBeUndefined();
  });

  it('offers Activity retry when embedded auth is required', () => {
    const status = resolveAuthStatus({
      isConfigured: true,
      loading: false,
      isSignedIn: false,
      isStandalone: false,
      supportsBrowserOAuth: false,
      isLocalDev: false,
    });
    expect(status.retryable).toBe(true);
    expect(status.browserSignIn).toBeUndefined();
  });
});
