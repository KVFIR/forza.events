import {getDiscordSdk, isStandaloneBrowser} from './discord';
import {
  DiscordLayoutMode,
  type DiscordLayoutModeValue,
  layoutModeFromUpdate,
} from './discordLayoutMode';

type LayoutUpdateHandler = (mode: DiscordLayoutModeValue) => void;

const LAYOUT_MODE_EVENT = 'ACTIVITY_LAYOUT_MODE_UPDATE' as const;

/**
 * Subscribe to Discord Activity layout mode (focused / PIP / grid).
 * Logo-only UI uses `layout_mode === 1` (PIP) only — no viewport heuristics.
 */
export function subscribeDiscordLayoutMode(onMode: LayoutUpdateHandler): () => void {
  if (isStandaloneBrowser()) {
    onMode(DiscordLayoutMode.FOCUSED);
    return () => {};
  }

  const sdk = getDiscordSdk();
  if (!sdk) {
    onMode(DiscordLayoutMode.FOCUSED);
    return () => {};
  }

  const handler = (data: {layout_mode?: number}) => {
    onMode(layoutModeFromUpdate(data));
  };

  let disposed = false;

  void sdk.subscribe(LAYOUT_MODE_EVENT, handler).catch((err) => {
    console.warn('Discord ACTIVITY_LAYOUT_MODE_UPDATE subscribe failed', err);
    if (!disposed) onMode(DiscordLayoutMode.FOCUSED);
  });

  return () => {
    disposed = true;
    void sdk.unsubscribe(LAYOUT_MODE_EVENT, handler).catch(() => {});
  };
}
