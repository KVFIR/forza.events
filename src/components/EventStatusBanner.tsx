import {cn} from '../lib/cn';

type Variant = 'draft' | 'host-in-progress' | 'registration-closed' | 'cancelled';

const copy: Record<Variant, {title: string; body: string}> = {
  draft: {
    title: 'Draft',
    body: 'Only you can see this event until you publish it.',
  },
  'host-in-progress': {
    title: 'Event in progress',
    body: 'Editing is locked. Submit results when the event is finished, or cancel if it will not run.',
  },
  'registration-closed': {
    title: 'Registration closed',
    body: 'This event has started. New players cannot join.',
  },
  cancelled: {
    title: 'Event cancelled',
    body: 'This event was cancelled by the host.',
  },
};

type Props = {
  variant: Variant;
  className?: string;
};

export function EventStatusBanner({variant, className}: Props) {
  const {title, body} = copy[variant];
  return (
    <div
      className={cn(
        'mt-3 rounded-lg border px-3 py-2.5 text-sm',
        variant === 'host-in-progress' && 'border-amber-500/25 bg-amber-500/10 text-amber-100/90',
        variant === 'registration-closed' && 'border-white/[0.08] bg-white/[0.04] text-slate-300',
        variant === 'draft' && 'border-sky-500/25 bg-sky-500/10 text-sky-100/90',
        variant === 'cancelled' && 'border-white/[0.08] bg-white/[0.04] text-slate-400',
        className,
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">{title}</p>
      <p className="mt-0.5 text-xs leading-relaxed">{body}</p>
    </div>
  );
}
