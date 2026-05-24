import {formatShareCode} from '../lib/shareCode';
import {cn} from '../lib/cn';

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  id?: string;
  semiTransparent?: boolean;
};

export function ShareCodeInput({
  value,
  onChange,
  className,
  placeholder = '000 000 000',
  id,
  semiTransparent,
}: Props) {
  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      spellCheck={false}
      maxLength={11}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(formatShareCode(e.target.value))}
      className={cn(
        className,
        semiTransparent && 'placeholder:text-muted/60 text-white/50',
      )}
    />
  );
}
