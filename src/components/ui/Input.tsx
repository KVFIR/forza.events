import type {InputHTMLAttributes} from 'react';
import {cn} from '../../lib/cn';
import {
  controlClassNames,
  isNativePickerInputType,
  nativePickerInputClass,
  nativePickerWrapperClass,
} from './formStyles';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export function Input({invalid, className, type, ...props}: Props) {
  const isNativePicker = isNativePickerInputType(type);
  const input = (
    <input
      type={type}
      className={cn(
        controlClassNames(invalid, className),
        isNativePicker && nativePickerInputClass,
      )}
      {...props}
    />
  );
  if (!isNativePicker) return input;
  return <div className={nativePickerWrapperClass}>{input}</div>;
}
