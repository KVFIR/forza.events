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
} from '../lib/discordLayoutMode';
import {subscribeDiscordLayoutMode} from '../lib/subscribeDiscordLayoutMode';
import {useAuth} from './AuthContext';

type DiscordLayoutState = {
  layoutMode: DiscordLayoutModeValue;
  /** Discord PIP / grid tile — app shows logo only until expanded. */
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

  const isCompact = useMemo(() => isCompactLayoutMode(layoutMode), [layoutMode]);

  const value = useMemo(() => ({layoutMode, isCompact}), [layoutMode, isCompact]);

  return (
    <DiscordLayoutContext.Provider value={value}>{children}</DiscordLayoutContext.Provider>
  );
}

export function useDiscordLayout(): DiscordLayoutState {
  return useContext(DiscordLayoutContext);
}
