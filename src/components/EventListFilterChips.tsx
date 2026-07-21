import type {ReactNode} from 'react';
import {cn} from '../lib/cn';

export type FilterChipOption<T extends string> = {
  value: T;
  label: ReactNode;
  /** Accent when selected (e.g. game colors). */
  selectedClassName?: string;
};

type ChipGroupProps<T extends string> = {
  /** Optional row label (My Events). Omit for compact unlabeled groups. */
  label?: string;
  value: T;
  onChange: (value: T) => void;
  options: FilterChipOption<T>[];
  'aria-label': string;
  /**
   * When set, clicking the already-selected chip calls onChange(deselectValue)
   * (no dedicated “All” chip — empty selection = all).
   */
  deselectValue?: T;
  className?: string;
};

/** Horizontal chip filters — labeled rows or compact unlabeled groups. */
export function EventListFilterChips<T extends string>({
  label,
  value,
  onChange,
  options,
  'aria-label': ariaLabel,
  deselectValue,
  className,
}: ChipGroupProps<T>) {
  return (
    <div
      className={cn('flex min-w-0 items-center gap-2', className)}
      role="group"
      aria-label={ariaLabel}
    >
      {label ? (
        <span className="w-11 shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
          {label}
        </span>
      ) : null}
      <div className="flex min-w-0 flex-wrap gap-1">
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                if (deselectValue !== undefined && selected) {
                  onChange(deselectValue);
                  return;
                }
                onChange(opt.value);
              }}
              className={cn(
                'rounded-md border px-2 py-1 text-[11px] font-semibold leading-none transition-colors',
                selected
                  ? (opt.selectedClassName ??
                      'border-white/25 bg-white/[0.1] text-white')
                  : 'border-transparent bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-slate-200',
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
