import type {CarRuleMode, EventType} from '../../lib/types';
import {cn} from '../../lib/cn';

const typeStyles: Record<EventType, {border: string; text: string; bg: string}> = {
  road: {border: 'border-rose-500/30', text: 'text-rose-300', bg: 'bg-rose-500/10'},
  dirt: {border: 'border-amber-600/30', text: 'text-amber-300', bg: 'bg-amber-600/10'},
  drift: {border: 'border-fuchsia-500/30', text: 'text-fuchsia-300', bg: 'bg-fuchsia-500/10'},
  touge: {border: 'border-violet-500/30', text: 'text-violet-300', bg: 'bg-violet-500/10'},
};

const labels: Record<EventType, string> = {
  road: 'Road',
  dirt: 'Dirt',
  drift: 'Drift',
  touge: 'Touge',
};

type Props = {
  type: EventType;
  className?: string;
};

export function Badge({type, className}: Props) {
  const s = typeStyles[type];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest',
        s.bg,
        s.border,
        s.text,
        className,
      )}
    >
      {labels[type]}
    </span>
  );
}

export function CarRuleBadge({
  mode,
  className,
}: {
  mode: CarRuleMode;
  className?: string;
}) {
  const restricted = mode === 'restricted_list';
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest',
        restricted
          ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200'
          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
        className,
      )}
    >
      {restricted ? 'Restricted car list' : 'Anything goes'}
    </span>
  );
}

type StatusProps = {
  status: 'open' | 'full' | 'live' | 'ended';
  className?: string;
};

const statusStyles: Record<
  StatusProps['status'],
  {border: string; text: string; bg: string; dot?: string}
> = {
  open: {
    border: 'border-accent-green/30',
    text: 'text-accent-green',
    bg: 'bg-accent-green/10',
    dot: 'bg-accent-green',
  },
  full: {
    border: 'border-amber-500/30',
    text: 'text-amber-300',
    bg: 'bg-amber-500/10',
  },
  live: {
    border: 'border-accent-green/40',
    text: 'text-accent-green',
    bg: 'bg-accent-green/15',
    dot: 'bg-accent-green',
  },
  ended: {
    border: 'border-slate-600/30',
    text: 'text-slate-500',
    bg: 'bg-slate-700/20',
  },
};

const statusLabels: Record<StatusProps['status'], string> = {
  open: 'Open',
  full: 'Full',
  live: 'Live',
  ended: 'Ended',
};

export function DraftBadge({className}: {className?: string}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border border-sky-500/35 bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-sky-200',
        className,
      )}
    >
      Draft
    </span>
  );
}

export function StatusBadge({status, className}: StatusProps) {
  const s = statusStyles[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest',
        s.bg,
        s.border,
        s.text,
        className,
      )}
    >
      {s.dot && <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />}
      {statusLabels[status]}
    </span>
  );
}
