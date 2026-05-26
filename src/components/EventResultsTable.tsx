import type {EventResultDisplay} from '../lib/events';
import {cn} from '../lib/cn';
import {Panel} from './ui/Panel';
import {panelDividedClass, sectionLabelClass} from './ui/formStyles';

type Props = {
  rows: EventResultDisplay[];
  pending?: boolean;
};

export function EventResultsTable({rows, pending}: Props) {
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
          'grid grid-cols-[2.5rem_1fr_auto] gap-x-3 border-b border-white/[0.06] px-4 py-2',
          sectionLabelClass,
        )}
      >
        <span>Pos</span>
        <span>Driver</span>
        <span className="text-right">Status</span>
      </div>
      <ol className={panelDividedClass}>
        {rows.map((row) => (
          <li
            key={`${row.position}-${row.label}`}
            className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-x-3 px-4 py-2.5"
          >
            <span
              className={cn(
                'text-sm font-black tabular-nums',
                row.position === 1 && !row.dnf ? 'text-amber-300' : 'text-slate-300',
              )}
            >
              {row.position}
            </span>
            <span
              className={cn(
                'truncate text-sm font-medium',
                row.dnf || row.dns ? 'text-muted line-through' : 'text-slate-200',
              )}
            >
              {row.label}
            </span>
            <span className={cn('text-right', sectionLabelClass)}>
              {row.dns ? 'DNS' : row.dnf ? 'DNF' : row.points != null ? `${row.points} pts` : 'Finish'}
            </span>
          </li>
        ))}
      </ol>
    </Panel>
  );
}
