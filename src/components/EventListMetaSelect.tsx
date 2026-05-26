import {Select} from './ui/Select';

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
    <Select
      variant="meta"
      value={value}
      aria-label={ariaLabel}
      className={className}
      onChange={(e) => onChange(e.target.value as T)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-card text-slate-200">
          {o.label}
        </option>
      ))}
    </Select>
  );
}
