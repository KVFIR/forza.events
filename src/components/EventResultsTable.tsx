import type {EventResultDisplay} from '../lib/events';
import {cn} from '../lib/cn';

type Props = {
  rows: EventResultDisplay[];
  pending?: boolean;
};

export function EventResultsTable({rows, pending}: Props) {
  if (pending) {
    return (
      <p className="rounded-xl border border-white/[0.07] bg-card px-4 py-3 text-sm text-muted">
        Results have not been posted yet.
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-white/[0.07] bg-card px-4 py-3 text-sm text-muted">
        No results recorded.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-card">
      <div className="grid grid-cols-[2.5rem_1fr_auto] gap-x-3 border-b border-white/[0.06] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-muted">
        <span>Pos</span>
        <span>Driver</span>
        <span className="text-right">Status</span>
      </div>
      <ol className="divide-y divide-white/[0.05]">
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
            <span className={cn('truncate text-sm font-medium', row.dnf ? 'text-muted line-through' : 'text-slate-200')}>
              {row.label}
            </span>
            <span className="text-right text-[10px] font-bold uppercase tracking-widest text-muted">
              {row.dnf ? 'DNF' : row.points != null ? `${row.points} pts` : 'Finish'}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
