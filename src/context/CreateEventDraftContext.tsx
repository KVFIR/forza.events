import {createContext, useContext, useMemo, useState, type ReactNode} from 'react';
import type {CreateEventFormSnapshot} from '../lib/createEventPersistence';

type CreateEventDraftContextValue = {
  parkedSession: CreateEventFormSnapshot | null;
  parkSession: (snapshot: CreateEventFormSnapshot | null) => void;
  clearParkedSession: () => void;
};

const CreateEventDraftContext = createContext<CreateEventDraftContextValue | null>(null);

export function CreateEventDraftProvider({children}: {children: ReactNode}) {
  const [parkedSession, setParkedSession] = useState<CreateEventFormSnapshot | null>(null);

  const value = useMemo(
    (): CreateEventDraftContextValue => ({
      parkedSession,
      parkSession: setParkedSession,
      clearParkedSession: () => setParkedSession(null),
    }),
    [parkedSession],
  );

  return (
    <CreateEventDraftContext.Provider value={value}>{children}</CreateEventDraftContext.Provider>
  );
}

export function useCreateEventDraftContext(): CreateEventDraftContextValue {
  const ctx = useContext(CreateEventDraftContext);
  if (!ctx) {
    throw new Error('useCreateEventDraftContext must be used within CreateEventDraftProvider');
  }
  return ctx;
}
