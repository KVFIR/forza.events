import {describe, expect, it} from 'vitest';
import {cronSecretConfiguredOk} from '../supabase/functions/_shared/cronSecret.ts';

describe('cronSecretConfiguredOk', () => {
  it('requires matching secret when configured', () => {
    expect(cronSecretConfiguredOk('abc', 'abc', false)).toBe(true);
    expect(cronSecretConfiguredOk(' abc ', 'abc', false)).toBe(true);
    expect(cronSecretConfiguredOk('wrong', 'abc', false)).toBe(false);
    expect(cronSecretConfiguredOk(null, 'abc', false)).toBe(false);
  });

  it('allows insecure mode when secret is unset', () => {
    expect(cronSecretConfiguredOk(null, undefined, true)).toBe(true);
    expect(cronSecretConfiguredOk(null, undefined, false)).toBe(false);
  });
});
