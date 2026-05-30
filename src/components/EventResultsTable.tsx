import {useTranslation} from 'react-i18next';
import {hasFinishingPosition} from '../lib/eventResults';
import type {EventResultDisplay} from '../lib/events';
import {cn} from '../lib/cn';
import {TextButton} from './ui/TextButton';
import {Panel} from './ui/Panel';
import {panelDividedClass} from './ui/formStyles';

type Props = {
  rows: EventResultDisplay[];
  pending?: boolean;
  loadFailed?: boolean;
  onRetryLoad?: () => void;
  /** Highlight the signed-in participant's row. */
  viewerDiscordId?: string;
};

export function EventResultsTable({
  rows,
  pending,
  loadFailed,
  onRetryLoad,
  viewerDiscordId,
}: Props) {
  const {t} = useTranslation();

  if (loadFailed) {
    return (
      <Panel className="flex flex-col gap-3 px-4 py-3 text-sm text-muted">
        <p>{t('results.loadFailed')}</p>
        {onRetryLoad ? (
          <TextButton tone="emphasis" className="self-start text-xs" onClick={onRetryLoad}>
            {t('common.tryAgain')}
          </TextButton>
        ) : null}
      </Panel>
    );
  }

  if (pending) {
    return (
      <Panel className="px-4 py-3 text-sm text-muted">{t('results.pendingHost')}</Panel>
    );
  }

  if (rows.length === 0) {
    return (
      <Panel className="px-4 py-3 text-sm text-muted">{t('results.noneRecorded')}</Panel>
    );
  }

  return (
    <Panel className="overflow-hidden">
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
                : t('results.noPosition');

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
                  row.dnf || row.dns ? 'text-muted' : 'text-slate-200',
                  isViewer && 'text-white',
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
