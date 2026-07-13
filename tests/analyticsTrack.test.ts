import {describe, expect, it} from 'vitest';
import {
  trackSecretConfiguredOk,
  trackSecretMatches,
} from '../supabase/functions/_shared/analyticsTrack.ts';

describe('analyticsTrack', () => {
  it('requires matching track secret when configured', () => {
    expect(trackSecretMatches('abc', 'abc')).toBe(true);
    expect(trackSecretMatches('wrong', 'abc')).toBe(false);
    expect(trackSecretMatches('x', undefined)).toBe(false);
  });

  it('allows ingest when track secret is unset on Edge', () => {
    expect(trackSecretConfiguredOk(null, undefined)).toBe(true);
    expect(trackSecretConfiguredOk('', undefined)).toBe(true);
  });

  it('requires header when track secret is configured', () => {
    expect(trackSecretConfiguredOk('abc', 'abc')).toBe(true);
    expect(trackSecretConfiguredOk('wrong', 'abc')).toBe(false);
    expect(trackSecretConfiguredOk(null, 'abc')).toBe(false);
  });
});
