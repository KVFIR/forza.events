import {EventResultsTable} from '../../../components/EventResultsTable';
import {formatLobbyCount} from '../../../lib/constants';
import {eventTypeMeta, normalizeEventType} from '../../../lib/eventTypes';
import type {EventDetailViewModel} from '../eventDetailView';
import {cn} from '../../../lib/cn';

type RegistrationProgressView = Pick<
  EventDetailViewModel,
  'ev' | 'fillPct' | 'showRegistrationProgress' | 'registrationOpen' | 'totalCapacity'
>;

export function EventRegistrationProgress({view}: {view: RegistrationProgressView}) {
  if (!view.showRegistrationProgress) return null;

  const muted = !view.registrationOpen || view.fillPct >= 100;
  const {badge, progressFill} = eventTypeMeta(normalizeEventType(view.ev.type));
  const fillWidth = Math.min(view.fillPct, 100);

  return (
    <div className="mt-2 flex items-center gap-3">
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]"
        role="progressbar"
        aria-valuenow={view.ev.currentPlayers}
        aria-valuemin={0}
        aria-valuemax={view.totalCapacity}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700',
            muted ? 'bg-white/25' : progressFill,
          )}
          style={{width: `${fillWidth}%`}}
        />
      </div>
      <span
        className={cn(
          'shrink-0 text-xs font-semibold tabular-nums',
          muted ? 'text-white/50' : badge.text,
        )}
      >
        {formatLobbyCount(view.ev.currentPlayers, view.totalCapacity)}
      </span>
    </div>
  );
}

type Props = {
  view: Pick<
    EventDetailViewModel,
    'showResultsSection' | 'resultsAwaitingHost' | 'resultDisplay'
  >;
  resultsLoadFailed: boolean;
  onRetryResultsLoad: () => void;
  viewerDiscordId: string;
};

export function EventDetailProgressSection({
  view,
  resultsLoadFailed,
  onRetryResultsLoad,
  viewerDiscordId,
}: Props) {
  if (view.showResultsSection) {
    return (
      <div className="mt-4">
        <EventResultsTable
          rows={view.resultDisplay}
          pending={view.resultsAwaitingHost}
          loadFailed={resultsLoadFailed}
          onRetryLoad={onRetryResultsLoad}
          viewerDiscordId={viewerDiscordId}
        />
      </div>
    );
  }

  return null;
}
