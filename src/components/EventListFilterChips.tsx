import type {ReactNode} from 'react';
import {cn} from '../lib/cn';

export type FilterChipOption<T extends string> = {
  value: T;
  label: ReactNode;
  /** Accent when selected (e.g. game colors). */
  selectedClassName?: string;
};

type ChipGroupProps<T extends string> = {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: FilterChipOption<T>[];
  'aria-label': string;
};

/** Labeled horizontal chip filters — clearer than unlabeled meta selects. */
export function EventListFilterChips<T extends string>({
  label,
  value,
  onChange,
  options,
  'aria-label': ariaLabel,
}: ChipGroupProps<T>) {
  return (
    <div className="flex min-w-0 items-center gap-2" role="group" aria-label={ariaLabel}>
      <span className="w-11 shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
        {label}
      </span>
      <div className="flex min-w-0 flex-wrap gap-1">
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(opt.value)}
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
