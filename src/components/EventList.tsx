import type {ReactNode} from 'react';
import {EventCard} from './EventCard';
import {ContentReveal} from './ui/ContentReveal';
import {EmptyState} from './ui/EmptyState';
import {PageLoading} from './ui/PageLoading';
import {Spinner} from './ui/Spinner';
import {useTranslation} from 'react-i18next';
import type {ParticipantEventResult} from '../lib/participantResults';
import type {ForzaEvent} from '../lib/types';
import type {HostDraftsLoadError, PublishedEventsLoadError} from '../lib/events';
import {cn} from '../lib/cn';

type Props = {
  events: ForzaEvent[];
  isLoading: boolean;
  isRefreshing?: boolean;
  loadError?: PublishedEventsLoadError | HostDraftsLoadError | null;
  onRetry?: () => void;
  emptyTitle: string;
  emptyDescription?: string;
  emptyAction?: {label: string; onClick: () => void};
  /** Sort control — top-right of the filter block. */
  sortControl?: ReactNode;
  /** Filter chip rows. */
  filters?: ReactNode;
  /** Published placement per event for the signed-in participant. */
  participantResults?: Map<string, ParticipantEventResult>;
  /** Browse uses cover-led cards; My Events stays compact. */
  cardDensity?: 'cover' | 'compact';
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
  sortControl,
  filters,
  participantResults,
  cardDensity = 'compact',
}: Props) {
  const {t} = useTranslation();
  const hasFetchError = !!loadError && events.length === 0 && !isLoading;

  if (isLoading && events.length === 0) {
    return <PageLoading label={t('loading.events')} />;
  }

  if (hasFetchError) {
    return (
      <ContentReveal>
        <EmptyState
          icon="⚠️"
          title={emptyTitle}
          description={emptyDescription}
          action={onRetry ? {label: t('common.tryAgain'), onClick: onRetry} : undefined}
          secondaryAction={emptyAction}
        />
      </ContentReveal>
    );
  }

  const countLabel =
    events.length === 0
      ? t('eventList.none')
      : t('eventList.found', {count: events.length});

  return (
    <ContentReveal>
      {(filters || sortControl) ? (
        <div className="mb-3 flex min-w-0 items-center gap-3">
          {filters ? <div className="min-w-0 flex-1 space-y-1.5">{filters}</div> : null}
          {sortControl ? <div className="shrink-0">{sortControl}</div> : null}
        </div>
      ) : null}

      <ul className={cn('flex list-none flex-col', cardDensity === 'cover' ? 'gap-3' : 'gap-2')}>
        {events.map((event) => (
          <li key={event.id}>
            <EventCard
              event={event}
              participantResult={participantResults?.get(event.id)}
              density={cardDensity}
            />
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

      <div className="mt-3 flex min-w-0 items-center gap-2">
        <p className="shrink-0 text-[10px] font-medium text-muted">{countLabel}</p>
        {isRefreshing ? (
          <Spinner size="sm" label={t('loading.refreshing')} className="shrink-0" muted />
        ) : null}
      </div>
    </ContentReveal>
  );
}
