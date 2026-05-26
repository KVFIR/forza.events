/** Optional artificial delay for testing loading UI (`VITE_DEV_LOADING_DELAY_MS`). */
export async function applyDevLoadingDelay(): Promise<void> {
  const raw = import.meta.env.VITE_DEV_LOADING_DELAY_MS;
  if (!raw) return;
  const ms = Number(raw);
  if (!Number.isFinite(ms) || ms <= 0) return;
  await new Promise((resolve) => window.setTimeout(resolve, ms));
}
