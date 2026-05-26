import type {SelectHTMLAttributes} from 'react';
import {cn} from '../../lib/cn';
import {selectClass, selectMetaClass} from './formStyles';

export type SelectVariant = 'form' | 'meta';

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  variant?: SelectVariant;
};

const variantClass: Record<SelectVariant, string> = {
  form: selectClass,
  meta: selectMetaClass,
};

export function Select({variant = 'form', className, children, ...props}: Props) {
  return (
    <select className={cn(variantClass[variant], className)} {...props}>
      {children}
    </select>
  );
}
