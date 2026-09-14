export const CHUNK_RELOAD_STORAGE_KEY = 'forza.chunk-reload-at';
export const CHUNK_RELOAD_COOLDOWN_MS = 10_000;
export const CHUNK_RELOAD_CLEAR_AFTER_MS = 5_000;

let installed = false;
let guardLocked = false;
let clearGuardTimer: ReturnType<typeof setTimeout> | undefined;

export function shouldReloadForChunkError(lastAtRaw: string | null, now = Date.now()): boolean {
  if (lastAtRaw == null || lastAtRaw === '') return true;
  const last = Number(lastAtRaw);
  if (!Number.isFinite(last) || last <= 0) return true;
  return now - last >= CHUNK_RELOAD_COOLDOWN_MS;
}

export function clearChunkReloadGuard(storage: Pick<Storage, 'removeItem'> = sessionStorage): void {
  guardLocked = false;
  cancelScheduledChunkGuardClear();
  try {
    storage.removeItem(CHUNK_RELOAD_STORAGE_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

export function cancelScheduledChunkGuardClear(): void {
  if (clearGuardTimer === undefined) return;
  clearTimeout(clearGuardTimer);
  clearGuardTimer = undefined;
}

/** Error screen: keep the cooldown even if `window` `load` fires afterwards. */
export function lockChunkReloadGuard(): void {
  cancelScheduledChunkGuardClear();
  guardLocked = true;
}

/** Clear the cooldown after a successful boot so a later 502 can auto-reload. */
export function scheduleChunkGuardClear(
  delayMs = CHUNK_RELOAD_CLEAR_AFTER_MS,
  storage: Pick<Storage, 'removeItem'> = sessionStorage,
): void {
  if (guardLocked) return;
  cancelScheduledChunkGuardClear();
  clearGuardTimer = setTimeout(() => {
    clearGuardTimer = undefined;
    clearChunkReloadGuard(storage);
  }, delayMs);
}

/** One auto-reload per cooldown. Error screens must lock the guard. */
export function installChunkLoadRecovery(): void {
  if (installed) return;
  installed = true;

  const onPreloadError = (event: Event) => {
    try {
      if (!shouldReloadForChunkError(sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY), Date.now())) {
        return;
      }
      sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, String(Date.now()));
    } catch {
      return;
    }
    event.preventDefault();
    window.location.reload();
  };

  window.addEventListener('vite:preloadError', onPreloadError);
  window.addEventListener('load', () => scheduleChunkGuardClear(), {once: true});
}
