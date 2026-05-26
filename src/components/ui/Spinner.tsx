import {Loader2} from 'lucide-react';
import {cn} from '../../lib/cn';

type Props = {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  /** Softer, lower-contrast spinner for non-blocking loads. */
  muted?: boolean;
};

const sizeClass = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
} as const;

export function Spinner({className, size = 'md', label, muted = false}: Props) {
  return (
    <span className={cn('inline-flex items-center justify-center', className)} role="status">
      <Loader2
        className={cn(
          'animate-spin',
          muted ? 'text-muted-light/55' : 'text-accent-purple-light',
          sizeClass[size],
        )}
        aria-hidden
      />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
