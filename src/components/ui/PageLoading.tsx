import type {ReactNode} from 'react';
import {cn} from '../../lib/cn';
import {Spinner} from './Spinner';

type Props = {
  label?: string;
  className?: string;
  compact?: boolean;
  children?: ReactNode;
};

/** Centered loading for a route or screen section. */
export function PageLoading({label = 'Loading', className, compact, children}: Props) {
  return (
    <div
      className={cn(
        'flex animate-fade-in flex-col items-center justify-center text-center opacity-45',
        compact ? 'py-16' : 'min-h-[40vh] py-20',
        className,
      )}
      aria-busy="true"
      aria-live="polite"
    >
      <Spinner size="lg" label={label} muted />
      <p className="mt-4 text-sm font-medium text-muted/80">{label}</p>
      {children}
    </div>
  );
}
