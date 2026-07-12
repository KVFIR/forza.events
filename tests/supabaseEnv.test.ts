import {describe, expect, it, vi, afterEach} from 'vitest';
import {shouldUseDirectSupabaseReads} from '../src/lib/supabaseEnv';

describe('shouldUseDirectSupabaseReads', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is true on localhost only', () => {
    const win: {location: {hostname: string}; parent: unknown} = {
      location: {hostname: 'localhost'},
      parent: null,
    };
    win.parent = win;
    vi.stubGlobal('window', win);
    expect(shouldUseDirectSupabaseReads()).toBe(true);
  });

  it('is false on forza.events production browser', () => {
    const win: {location: {hostname: string}; parent: unknown} = {
      location: {hostname: 'forza.events'},
      parent: null,
    };
    win.parent = win;
    vi.stubGlobal('window', win);
    expect(shouldUseDirectSupabaseReads()).toBe(false);
  });
});
