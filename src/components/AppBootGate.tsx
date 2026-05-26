import type {ReactNode} from 'react';
import {useAuth} from '../context/AuthContext';
import {PageLoading} from './ui/PageLoading';

type Props = {
  children: ReactNode;
};

/** Blocks route content until Discord auth (and optional launch redirect) finish. */
export function AppBootGate({children}: Props) {
  const {loading, bootMessage} = useAuth();

  if (loading) {
    return (
      <PageLoading label={bootMessage} className="pb-8 pt-5">
        {bootMessage === 'Opening your event' ? (
          <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted/80">
            Loading the event you opened from Discord…
          </p>
        ) : null}
      </PageLoading>
    );
  }

  return <>{children}</>;
}
