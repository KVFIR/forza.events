import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {RichPresenceActivity} from '../lib/discordRichPresence';
import {richPresencePayloadKey} from '../lib/discordRichPresenceSession';

type RichPresenceContextValue = {
  override: RichPresenceActivity | null;
  setRichPresenceOverride: (activity: RichPresenceActivity | null) => void;
};

const DiscordRichPresenceContext = createContext<RichPresenceContextValue | null>(null);

export function DiscordRichPresenceProvider({children}: {children: ReactNode}) {
  const [override, setOverride] = useState<RichPresenceActivity | null>(null);
  const overrideKeyRef = useRef<string | null>(null);

  const setRichPresenceOverride = useCallback((activity: RichPresenceActivity | null) => {
    const key = activity ? richPresencePayloadKey(activity) : null;
    if (key === overrideKeyRef.current) return;
    overrideKeyRef.current = key;
    setOverride(activity);
  }, []);

  const value = useMemo(
    () => ({override, setRichPresenceOverride}),
    [override, setRichPresenceOverride],
  );

  return (
    <DiscordRichPresenceContext.Provider value={value}>
      {children}
    </DiscordRichPresenceContext.Provider>
  );
}

export function useRichPresenceOverride(): RichPresenceContextValue {
  const ctx = useContext(DiscordRichPresenceContext);
  if (!ctx) {
    throw new Error('useRichPresenceOverride must be used within DiscordRichPresenceProvider');
  }
  return ctx;
}
