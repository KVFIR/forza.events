import type {TextareaHTMLAttributes} from 'react';
import {cn} from '../../lib/cn';
import {controlClassNames} from './formStyles';

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
};

export function Textarea({invalid, className, ...props}: Props) {
  return (
    <textarea className={cn(controlClassNames(invalid, className), 'resize-none')} {...props} />
  );
}
