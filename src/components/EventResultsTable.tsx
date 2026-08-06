import {useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {hasFinishingPosition, inferResultsDisplayLayout} from '../lib/eventResults';
import type {EventResultDisplay} from '../lib/events';
import {cn} from '../lib/cn';
import {Alert} from './ui/Alert';
import {TextButton} from './ui/TextButton';
import {Panel} from './ui/Panel';
import {panelDividedClass} from './ui/formStyles';
import {SegmentGroup} from './ui/SegmentGroup';

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
  const inferred = useMemo(() => inferResultsDisplayLayout(rows), [rows]);
  const [layoutOverride, setLayoutOverride] = useState<'per_group' | 'overall' | null>(null);
  const displayLayout = layoutOverride ?? inferred;

  if (loadFailed && !pending) {
    return (
      <Alert variant="info" className="flex flex-col gap-3 py-2.5 text-sm">
        <p>{t('results.loadFailed')}</p>
        {onRetryLoad ? (
          <TextButton tone="emphasis" className="self-start text-xs" onClick={onRetryLoad}>
            {t('common.tryAgain')}
          </TextButton>
        ) : null}
      </Alert>
    );
  }

  if (pending) {
    return (
      <Alert variant="info" className="py-2.5 text-sm">
        {t('results.pendingHost')}
      </Alert>
    );
  }

  if (rows.length === 0) {
    return (
      <Alert variant="info" className="py-2.5 text-sm">
        {t('results.noneRecorded')}
      </Alert>
    );
  }

  const groupOrder: number[] = [];
  const rowsByGroup = new Map<number, EventResultDisplay[]>();
  for (const row of rows) {
    const g = row.groupIndex ?? 1;
    if (!rowsByGroup.has(g)) {
      rowsByGroup.set(g, []);
      groupOrder.push(g);
    }
    rowsByGroup.get(g)!.push(row);
  }
  const multiGroup = groupOrder.length > 1;

  const renderRow = (row: EventResultDisplay, opts?: {showGroup?: boolean}) => {
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
          {opts?.showGroup ? (
            <span className="ml-1.5 text-[10px] font-bold uppercase tracking-widest text-muted">
              {t('eventDetail.group', {n: row.groupIndex ?? 1})}
            </span>
          ) : null}
          {isViewer ? (
            <span className="ml-1.5 text-[10px] font-bold uppercase tracking-widest text-accent-purple-light">
              · {t('results.yourRow')}
            </span>
          ) : null}
          {showPosition && row.points != null ? (
            <span className="ml-1.5 text-xs text-muted">{row.points} pts</span>
          ) : null}
          {row.ratingDelta != null && row.ratingDelta !== 0 ? (
            <span
              className={cn(
                'ml-1.5 text-xs tabular-nums',
                row.ratingDelta > 0 ? 'text-accent-green' : 'text-red-300/90',
              )}
            >
              {row.ratingDelta > 0 ? '+' : ''}
              {row.ratingDelta}
            </span>
          ) : null}
        </span>
      </li>
    );
  };

  const layoutToggle = multiGroup ? (
    <SegmentGroup
      containerClassName="mb-3"
      ariaLabel={t('results.rankingModeAria')}
      value={displayLayout}
      onChange={setLayoutOverride}
      options={[
        {value: 'per_group', label: t('results.modeByConvoy')},
        {value: 'overall', label: t('results.modeOverall')},
      ]}
    />
  ) : null;

  if (displayLayout === 'overall' || !multiGroup) {
    const overallRows =
      displayLayout === 'overall'
        ? [...rows].sort((a, b) => {
            const aOk = hasFinishingPosition(a);
            const bOk = hasFinishingPosition(b);
            if (aOk && bOk) return (a.position ?? 0) - (b.position ?? 0);
            if (aOk) return -1;
            if (bOk) return 1;
            return 0;
          })
        : rows;

    return (
      <div>
        {layoutToggle}
        <Panel className="overflow-hidden">
          <ol className={panelDividedClass}>
            {overallRows.map((row) =>
              renderRow(row, {showGroup: multiGroup && displayLayout === 'overall'}),
            )}
          </ol>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {layoutToggle}
      {groupOrder.map((g) => (
        <div key={g}>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-muted">
            {t('eventDetail.group', {n: g})}
          </p>
          <Panel className="overflow-hidden">
            <ol className={panelDividedClass}>{rowsByGroup.get(g)!.map((row) => renderRow(row))}</ol>
          </Panel>
        </div>
      ))}
    </div>
  );
}
