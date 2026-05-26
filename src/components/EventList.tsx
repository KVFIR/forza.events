import type {ReactNode} from 'react';
import {EventCard} from './EventCard';
import {ContentReveal} from './ui/ContentReveal';
import {EmptyState} from './ui/EmptyState';
import {PageLoading} from './ui/PageLoading';
import {Spinner} from './ui/Spinner';
import {useLoadingUI} from '../hooks/useLoadingUI';
import type {ForzaEvent} from '../lib/types';
import type {PublishedEventsLoadError} from '../lib/events';

type Props = {
  events: ForzaEvent[];
  isLoading: boolean;
  isRefreshing?: boolean;
  loadError?: PublishedEventsLoadError | null;
  onRetry?: () => void;
  emptyTitle: string;
  emptyDescription?: string;
  emptyAction?: {label: string; onClick: () => void};
  metaRight?: ReactNode;
};

export function EventList({
  events,
  isLoading,
  isRefreshing = false,
  loadError,
  onRetry,
  emptyTitle,
  emptyDescription,
  emptyAction,
  metaRight,
}: Props) {
  const showLoadingUI = useLoadingUI(isLoading && events.length === 0);
  const hasFetchError = !!loadError && events.length === 0 && !isLoading;

  if (showLoadingUI) {
    return <PageLoading label="Loading events" />;
  }

  if (isLoading && events.length === 0) {
    return null;
  }

  if (hasFetchError) {
    return (
      <ContentReveal>
        <EmptyState
          icon="⚠️"
          title={emptyTitle}
          description={emptyDescription}
          action={onRetry ? {label: 'Try again', onClick: onRetry} : undefined}
          secondaryAction={emptyAction}
        />
      </ContentReveal>
    );
  }

  const countLabel =
    events.length === 0
      ? 'No events'
      : `${events.length} event${events.length !== 1 ? 's' : ''} found`;

  return (
    <ContentReveal>
      <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <p className="shrink-0 text-[11px] font-medium text-muted">{countLabel}</p>
          {isRefreshing ? (
            <Spinner size="sm" label="Refreshing" className="shrink-0" muted />
          ) : null}
        </div>
        {metaRight ? (
          <div className="flex min-w-0 items-center justify-end gap-1.5">{metaRight}</div>
        ) : null}
      </div>

      <ul className="flex list-none flex-col gap-2">
        {events.map((event) => (
          <li key={event.id}>
            <EventCard event={event} />
          </li>
        ))}
      </ul>

      {events.length === 0 && (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          secondaryAction={emptyAction}
        />
      )}
    </ContentReveal>
  );
}
