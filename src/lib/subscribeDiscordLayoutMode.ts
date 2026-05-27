import {getDiscordSdk, isStandaloneBrowser} from './discord';
import {
  DiscordLayoutMode,
  type DiscordLayoutModeValue,
  isCompactViewport,
  layoutModeFromUpdate,
} from './discordLayoutMode';

type LayoutUpdateHandler = (mode: DiscordLayoutModeValue) => void;

type LayoutCapableSdk = {
  subscribeToLayoutModeUpdatesCompat?: (handler: (update: {layout_mode?: number}) => void) => void;
  unsubscribeFromLayoutModeUpdatesCompat?: (
    handler: (update: {layout_mode?: number}) => void,
  ) => void;
};

function viewportFallbackMode(): DiscordLayoutModeValue {
  return isCompactViewport() ? DiscordLayoutMode.PIP : DiscordLayoutMode.FOCUSED;
}

/**
 * Subscribe to Discord Activity layout mode (focused / PIP / grid).
 * Falls back to viewport size in standalone dev when the SDK is absent.
 */
export function subscribeDiscordLayoutMode(onMode: LayoutUpdateHandler): () => void {
  if (isStandaloneBrowser()) {
    const sync = () => onMode(viewportFallbackMode());
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }

  const sdk = getDiscordSdk() as LayoutCapableSdk | null;
  if (!sdk?.subscribeToLayoutModeUpdatesCompat) {
    const sync = () => onMode(viewportFallbackMode());
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }

  const handler = (update: {layout_mode?: number}) => {
    onMode(layoutModeFromUpdate(update));
  };

  sdk.subscribeToLayoutModeUpdatesCompat(handler);
  return () => sdk.unsubscribeFromLayoutModeUpdatesCompat?.(handler);
}
