import type {ReactNode} from 'react';
import {cn} from '../../../lib/cn';
import {formFieldError, formLabel} from '../constants';

export function Field({
  title,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  title: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  const errorId = error && htmlFor ? `${htmlFor}-error` : undefined;
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className={formLabel}>
        {title}
      </label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
      {error && (
        <p id={errorId} role="alert" className={formFieldError}>
          {error}
        </p>
      )}
    </div>
  );
}

export function Divider() {
  return <div className="h-px bg-white/[0.05]" />;
}

export function fieldInputClass(hasError: boolean) {
  return cn(hasError && 'border-red-500/50 focus:border-red-400/60');
}
