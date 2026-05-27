import type {ReactNode} from 'react';
import {cn} from '../../lib/cn';
import {Button} from './Button';
import {TextButton} from './TextButton';
import {emptyIconClass} from './formStyles';

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
      <div className={emptyIconClass}>{icon}</div>
      <div className="max-w-sm space-y-1">
        <p className="text-sm font-medium text-slate-200">{title}</p>
        {description ? <p className="text-xs leading-relaxed text-muted">{description}</p> : null}
      </div>
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          {action ? (
            <Button
              type="button"
              variant="secondary"
              className="min-w-[7rem] border-accent-purple/35 text-accent-purple-light hover:border-accent-purple/50"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ) : null}
          {secondaryAction ? (
            <TextButton type="button" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </TextButton>
          ) : null}
        </div>
      )}
    </div>
  );
}
