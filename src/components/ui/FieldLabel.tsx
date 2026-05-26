import type {LabelHTMLAttributes, ReactNode} from 'react';
import {cn} from '../../lib/cn';
import {fieldLabelClass} from './formStyles';

type Props = LabelHTMLAttributes<HTMLLabelElement> & {
  children: ReactNode;
};

export function FieldLabel({className, children, ...props}: Props) {
  return (
    <label className={cn(fieldLabelClass, className)} {...props}>
      {children}
    </label>
  );
}
