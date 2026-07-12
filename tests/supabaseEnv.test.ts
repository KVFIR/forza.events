import {describe, expect, it, vi, afterEach} from 'vitest';
import {shouldUseDirectSupabaseReads, resolveSupabaseUrl} from '../src/lib/supabaseEnv';

describe('shouldUseDirectSupabaseReads', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
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
    const win: {location: {hostname: string; origin: string}; parent: unknown} = {
      location: {hostname: 'forza.events', origin: 'https://forza.events'},
      parent: null,
    };
    win.parent = win;
    vi.stubGlobal('window', win);
    expect(shouldUseDirectSupabaseReads()).toBe(false);
  });
});

describe('resolveSupabaseUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('proxies through origin on forza.events', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://uoysqfczahqmctbrrizn.supabase.co');
    const win: {location: {hostname: string; origin: string}; parent: unknown} = {
      location: {hostname: 'forza.events', origin: 'https://forza.events'},
      parent: null,
    };
    win.parent = win;
    vi.stubGlobal('window', win);
    expect(resolveSupabaseUrl()).toBe('https://forza.events/supabase');
  });

  it('returns direct project URL in Discord Activity iframe', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://uoysqfczahqmctbrrizn.supabase.co');
    const outer = {location: {hostname: 'forza.events', origin: 'https://forza.events'}};
    const win = {location: {hostname: 'discordsays.com', origin: 'https://x.discordsays.com'}, parent: outer};
    vi.stubGlobal('window', win);
    expect(resolveSupabaseUrl()).toBe('https://uoysqfczahqmctbrrizn.supabase.co');
  });
});
