import type {InputHTMLAttributes} from 'react';
import {cn} from '../../lib/cn';
import {controlClassNames} from './formStyles';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export function Input({invalid, className, ...props}: Props) {
  return <input className={cn(controlClassNames(invalid, className))} {...props} />;
}
