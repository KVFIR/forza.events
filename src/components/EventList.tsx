import type {ReactNode} from 'react';
import {EventCard} from './EventCard';
import type {ForzaEvent} from '../lib/types';

type Props = {
  events: ForzaEvent[];
  loading: boolean;
  loadingLabel?: string;
  emptyTitle: string;
  emptyAction?: {label: string; onClick: () => void};
  metaRight?: ReactNode;
};

export function EventList({
  events,
  loading,
  loadingLabel = 'Loading events…',
  emptyTitle,
  emptyAction,
  metaRight,
}: Props) {
  if (loading) {
    return <p className="text-sm text-muted">{loadingLabel}</p>;
  }

  const countLabel =
    events.length === 0
      ? 'No events'
      : `${events.length} event${events.length !== 1 ? 's' : ''} found`;

  return (
    <>
      <div className="mb-3 flex min-w-0 items-center justify-between gap-3">
        <p className="shrink-0 text-[11px] font-medium text-muted">{countLabel}</p>
        {metaRight ? (
          <div className="flex min-w-0 items-center justify-end gap-1.5">{metaRight}</div>
        ) : null}
      </div>

      <ul className="flex list-none flex-col gap-2">
        {events.map((event, i) => (
          <li key={event.id} style={{animationDelay: `${i * 40}ms`}} className="animate-slide-up">
            <EventCard event={event} />
          </li>
        ))}
      </ul>

      {events.length === 0 && (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.07] bg-card">
            <span className="text-2xl">🏁</span>
          </div>
          <p className="text-sm font-medium text-muted">{emptyTitle}</p>
          {emptyAction && (
            <button
              type="button"
              onClick={emptyAction.onClick}
              className="text-xs font-semibold text-accent-purple transition-colors hover:text-accent-purple-light"
            >
              {emptyAction.label}
            </button>
          )}
        </div>
      )}
    </>
  );
}
