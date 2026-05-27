import {useTranslation} from 'react-i18next';
import {hasFinishingPosition} from '../lib/eventResults';
import type {EventResultDisplay} from '../lib/events';
import {cn} from '../lib/cn';
import {Panel} from './ui/Panel';
import {panelDividedClass, sectionLabelClass} from './ui/formStyles';

type Props = {
  rows: EventResultDisplay[];
  pending?: boolean;
  /** Highlight the signed-in participant's row. */
  viewerDiscordId?: string;
};

export function EventResultsTable({rows, pending, viewerDiscordId}: Props) {
  const {t} = useTranslation();
  if (pending) {
    return (
      <Panel className="px-4 py-3 text-sm text-muted">
        Results have not been posted yet.
      </Panel>
    );
  }

  if (rows.length === 0) {
    return (
      <Panel className="px-4 py-3 text-sm text-muted">No results recorded.</Panel>
    );
  }

  return (
    <Panel className="overflow-hidden">
      <div
        className={cn(
          'grid grid-cols-[2.75rem_1fr] gap-x-3 border-b border-white/[0.06] px-4 py-2',
          sectionLabelClass,
        )}
      >
        <span>Pos</span>
        <span>Driver</span>
      </div>
      <ol className={panelDividedClass}>
        {rows.map((row) => {
          const isViewer = Boolean(viewerDiscordId && row.discordId === viewerDiscordId);
          const showPosition = hasFinishingPosition(row);
          const posLabel = row.dns
            ? t('results.dns')
            : row.dnf
              ? t('results.dnf')
              : showPosition
                ? String(row.position)
                : '—';

          return (
            <li
              key={row.discordId}
              className={cn(
                'grid grid-cols-[2.75rem_1fr] items-center gap-x-3 px-4 py-2.5',
                isViewer && 'bg-accent-purple/10',
              )}
            >
              <span
                className={cn(
                  'text-sm font-black tabular-nums',
                  showPosition && row.position === 1
                    ? 'text-amber-300'
                    : row.dnf || row.dns
                      ? 'text-[10px] uppercase tracking-widest text-muted'
                      : showPosition && isViewer
                        ? 'text-accent-purple-light'
                        : 'text-slate-300',
                )}
              >
                {posLabel}
              </span>
              <span
                className={cn(
                  'truncate text-sm font-medium',
                  row.dnf || row.dns ? 'text-muted line-through' : 'text-slate-200',
                  isViewer && !row.dnf && !row.dns && 'text-white',
                )}
              >
                {row.label}
                {isViewer ? (
                  <span className="ml-1.5 text-[10px] font-bold uppercase tracking-widest text-accent-purple-light">
                    · {t('results.yourRow')}
                  </span>
                ) : null}
                {showPosition && row.points != null ? (
                  <span className="ml-1.5 text-xs text-muted">{row.points} pts</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
