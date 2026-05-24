import {cn} from '../lib/cn';

type Option<T extends string> = {value: T; label: string};

type Props<T extends string> = {
  value: T;
  onChange: (v: T) => void;
  options: Option<T>[];
  'aria-label': string;
  className?: string;
};

export function EventListMetaSelect<T extends string>({
  value,
  onChange,
  options,
  'aria-label': ariaLabel,
  className,
}: Props<T>) {
  return (
    <select
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value as T)}
      className={cn(
        'max-w-[6.5rem] cursor-pointer truncate bg-transparent text-[11px] font-medium text-muted',
        'hover:text-slate-300 focus:text-accent-purple-light focus:outline-none',
        className,
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-card text-slate-200">
          {o.label}
        </option>
      ))}
    </select>
  );
}
