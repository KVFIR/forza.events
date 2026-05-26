import {cn} from '../../lib/cn';
import {Spinner} from './Spinner';

type Props = {
  label: string;
  className?: string;
};

/** Loading placeholder for form fields and modals. */
export function InlineLoading({label, className}: Props) {
  return (
    <div
      className={cn(
        'flex min-h-[2.625rem] animate-fade-in items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 opacity-50',
        className,
      )}
      aria-busy="true"
      aria-live="polite"
    >
      <Spinner size="sm" label={label} muted />
      <span className="text-sm text-muted/80">{label}</span>
    </div>
  );
}
