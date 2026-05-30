import {EventResultsTable} from '../../../components/EventResultsTable';
import {formatLobbyCount} from '../../../lib/constants';
import type {EventDetailViewModel} from '../eventDetailView';
import {cn} from '../../../lib/cn';

type Props = {
  view: Pick<
    EventDetailViewModel,
    | 'ev'
    | 'fillPct'
    | 'showResultsSection'
    | 'showRegistrationProgress'
    | 'resultsAwaitingHost'
    | 'resultDisplay'
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

  if (!view.showRegistrationProgress) return null;

  return (
    <div className="mt-4">
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-700',
              view.fillPct >= 100
                ? 'bg-amber-400'
                : 'bg-gradient-to-r from-accent-purple-dark to-accent-purple-light',
            )}
            style={{width: `${Math.min(view.fillPct, 100)}%`}}
          />
        </div>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-300">
          {formatLobbyCount(view.ev.currentPlayers)}
        </span>
      </div>
    </div>
  );
}
