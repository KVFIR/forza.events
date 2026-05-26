import type {InputHTMLAttributes, ReactNode} from 'react';
import {cn} from '../../lib/cn';
import {checkboxLabelClass} from './formStyles';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: ReactNode;
  className?: string;
};

export function CheckboxField({label, className, ...props}: Props) {
  return (
    <label className={cn(checkboxLabelClass, className)}>
      <input
        type="checkbox"
        className="rounded border-white/20 bg-white/[0.05]"
        {...props}
      />
      {label}
    </label>
  );
}
