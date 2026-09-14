import {afterEach, describe, expect, it, vi} from 'vitest';
import {
  CHUNK_RELOAD_CLEAR_AFTER_MS,
  CHUNK_RELOAD_COOLDOWN_MS,
  cancelScheduledChunkGuardClear,
  clearChunkReloadGuard,
  lockChunkReloadGuard,
  scheduleChunkGuardClear,
  shouldReloadForChunkError,
} from '../src/lib/chunkLoadRecovery';

describe('shouldReloadForChunkError', () => {
  it('reloads when there is no previous attempt', () => {
    expect(shouldReloadForChunkError(null)).toBe(true);
    expect(shouldReloadForChunkError('')).toBe(true);
  });

  it('blocks a second reload inside the cooldown', () => {
    const now = 1_000_000;
    expect(shouldReloadForChunkError(String(now), now + CHUNK_RELOAD_COOLDOWN_MS - 1)).toBe(
      false,
    );
  });

  it('allows another reload after the cooldown', () => {
    const now = 1_000_000;
    expect(shouldReloadForChunkError(String(now), now + CHUNK_RELOAD_COOLDOWN_MS)).toBe(true);
  });
});

describe('chunk reload guard timer', () => {
  afterEach(() => {
    clearChunkReloadGuard({removeItem: () => {}});
    cancelScheduledChunkGuardClear();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('clears the guard after a successful boot delay', () => {
    vi.useFakeTimers();
    const storage = {removeItem: vi.fn()};
    scheduleChunkGuardClear(CHUNK_RELOAD_CLEAR_AFTER_MS, storage);
    vi.advanceTimersByTime(CHUNK_RELOAD_CLEAR_AFTER_MS);
    expect(storage.removeItem).toHaveBeenCalledTimes(1);
  });

  it('keeps the guard when the error screen locks before window load', () => {
    vi.useFakeTimers();
    const storage = {removeItem: vi.fn()};
    lockChunkReloadGuard();
    scheduleChunkGuardClear(CHUNK_RELOAD_CLEAR_AFTER_MS, storage);
    vi.advanceTimersByTime(CHUNK_RELOAD_CLEAR_AFTER_MS + 1);
    expect(storage.removeItem).not.toHaveBeenCalled();
    clearChunkReloadGuard(storage);
    expect(storage.removeItem).toHaveBeenCalledTimes(1);
  });

  it('auto-reloads once per cooldown', async () => {
    vi.resetModules();
    const reloads = vi.fn();
    const store = new Map<string, string>();
    const listeners = new Map<string, (event: {preventDefault: () => void}) => void>();
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
    vi.stubGlobal('window', {
      addEventListener: (type: string, fn: (event: {preventDefault: () => void}) => void) => {
        listeners.set(type, fn);
      },
      location: {reload: reloads},
    });
    const {installChunkLoadRecovery} = await import('../src/lib/chunkLoadRecovery');
    installChunkLoadRecovery();
    const onError = listeners.get('vite:preloadError');
    expect(onError).toBeTypeOf('function');
    const first = {preventDefault: vi.fn()};
    onError!(first);
    expect(first.preventDefault).toHaveBeenCalledTimes(1);
    expect(reloads).toHaveBeenCalledTimes(1);
    const second = {preventDefault: vi.fn()};
    onError!(second);
    expect(second.preventDefault).not.toHaveBeenCalled();
    expect(reloads).toHaveBeenCalledTimes(1);
  });
});
