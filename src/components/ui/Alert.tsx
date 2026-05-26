import type {ReactNode} from 'react';
import {cn} from '../../lib/cn';
import {sectionLabelClass} from './formStyles';

export type AlertVariant = 'neutral' | 'info' | 'warning' | 'error' | 'draft' | 'sky';

const variantClass: Record<AlertVariant, string> = {
  neutral: 'border-white/[0.08] bg-white/[0.03] text-muted',
  info: 'border-white/[0.08] bg-white/[0.04] text-slate-300',
  warning: 'border-amber-500/25 bg-amber-500/10 text-amber-200/90',
  error: 'border-red-500/25 bg-red-950/30 text-red-200',
  draft: 'border-sky-500/25 bg-sky-500/10 text-sky-100/90',
  sky: 'border-sky-500/25 bg-sky-950/20 text-sky-100/90',
};

type Props = {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  className?: string;
};

export function Alert({variant = 'neutral', title, children, className}: Props) {
  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2 text-xs leading-relaxed',
        variantClass[variant],
        className,
      )}
      role={variant === 'error' ? 'alert' : undefined}
    >
      {title ? (
        <p className={cn(sectionLabelClass, 'mb-0.5 opacity-80')}>{title}</p>
      ) : null}
      <div className={title ? 'mt-0.5' : undefined}>{children}</div>
    </div>
  );
}
