import type {ReactNode} from 'react';
import {cn} from '../../lib/cn';
import {
  segmentContainerClass,
  segmentItemBaseClass,
  segmentItemIdleClass,
  segmentItemSelectedClass,
} from './buttonStyles';

export type SegmentOption<T extends string> = {
  value: T;
  label: ReactNode;
  /** Per-option selected styles (e.g. event type accent). Falls back to neutral selected. */
  selectedClassName?: string;
};

type Props<T extends string> = {
  /** When empty, no segment is selected. */
  value: T | '';
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
  ariaLabel: string;
  invalid?: boolean;
  disabled?: boolean;
  layout?: 'flex' | 'grid';
  containerClassName?: string;
  itemClassName?: string;
};

export function SegmentGroup<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  invalid,
  disabled,
  layout = 'flex',
  containerClassName,
  itemClassName,
}: Props<T>) {
  return (
    <div
      className={cn(
        segmentContainerClass,
        'min-w-0 w-full',
        layout === 'grid' && 'grid gap-1',
        layout === 'flex' && 'flex',
        disabled && 'opacity-60',
        containerClassName,
      )}
      role="group"
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      aria-disabled={disabled || undefined}
    >
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              segmentItemBaseClass,
              layout === 'grid' && 'min-w-0',
              layout === 'flex' && 'flex-1',
              itemClassName,
              selected
                ? (opt.selectedClassName ?? segmentItemSelectedClass)
                : segmentItemIdleClass,
              disabled && 'cursor-not-allowed',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
