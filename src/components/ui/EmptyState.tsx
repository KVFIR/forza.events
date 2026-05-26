import type {ReactNode} from 'react';
import {cn} from '../../lib/cn';
import {Button} from './Button';

type Action = {
  label: string;
  onClick: () => void;
};

type Props = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: Action;
  secondaryAction?: Action;
  className?: string;
};

export function EmptyState({
  icon = '🏁',
  title,
  description,
  action,
  secondaryAction,
  className,
}: Props) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 px-4 text-center',
        className ?? 'mt-16',
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.07] bg-card text-2xl">
        {icon}
      </div>
      <div className="max-w-sm space-y-1">
        <p className="text-sm font-medium text-slate-200">{title}</p>
        {description ? <p className="text-xs leading-relaxed text-muted">{description}</p> : null}
      </div>
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          {action ? (
            <Button type="button" variant="primary" className="min-w-[7rem]" onClick={action.onClick}>
              {action.label}
            </Button>
          ) : null}
          {secondaryAction ? (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="text-xs font-semibold text-accent-purple transition-colors hover:text-accent-purple-light"
            >
              {secondaryAction.label}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
