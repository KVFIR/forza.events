import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DiscordLayoutMode,
  type DiscordLayoutModeValue,
  isCompactLayoutMode,
  isCompactViewport,
} from '../lib/discordLayoutMode';
import {subscribeDiscordLayoutMode} from '../lib/subscribeDiscordLayoutMode';
import {useAuth} from './AuthContext';

type DiscordLayoutState = {
  layoutMode: DiscordLayoutModeValue;
  /** PIP / grid tile, or small viewport in dev. */
  isCompact: boolean;
};

const DiscordLayoutContext = createContext<DiscordLayoutState>({
  layoutMode: DiscordLayoutMode.FOCUSED,
  isCompact: false,
});

export function DiscordLayoutProvider({children}: {children: ReactNode}) {
  const {discordReady, isStandalone} = useAuth();
  const [layoutMode, setLayoutMode] = useState<DiscordLayoutModeValue>(DiscordLayoutMode.FOCUSED);

  useEffect(() => {
    if (!isStandalone && !discordReady) return;
    return subscribeDiscordLayoutMode(setLayoutMode);
  }, [discordReady, isStandalone]);

  const isCompact = useMemo(() => {
    if (isCompactLayoutMode(layoutMode)) return true;
    if (layoutMode === DiscordLayoutMode.UNHANDLED) return isCompactViewport();
    return false;
  }, [layoutMode]);

  const value = useMemo(() => ({layoutMode, isCompact}), [layoutMode, isCompact]);

  return (
    <DiscordLayoutContext.Provider value={value}>{children}</DiscordLayoutContext.Provider>
  );
}

export function useDiscordLayout(): DiscordLayoutState {
  return useContext(DiscordLayoutContext);
}
