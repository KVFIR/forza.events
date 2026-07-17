import type {TextareaHTMLAttributes} from 'react';
import {cn} from '../../lib/cn';
import {controlClassNames} from './formStyles';

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
  /** Grow with content up to ~12 lines, then scroll inside the field. */
  autoGrow?: boolean;
};

export function Textarea({invalid, autoGrow, className, ...props}: Props) {
  return (
    <textarea
      className={cn(
        controlClassNames(invalid, className),
        autoGrow
          ? 'max-h-48 [field-sizing:content] overflow-y-auto'
          : 'resize-none',
      )}
      {...props}
    />
  );
}
