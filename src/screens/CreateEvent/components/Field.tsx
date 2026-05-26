import type {ReactNode} from 'react';
import {cn} from '../../../lib/cn';
import {
  controlInvalidClass,
  dividerClass,
  fieldErrorClass,
  fieldHintClass,
  fieldLabelClass,
} from '../../../components/ui/formStyles';

export function Field({
  title,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  title: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  const errorId = error && htmlFor ? `${htmlFor}-error` : undefined;
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className={cn(fieldLabelClass, 'mb-1.5')}>
        {title}
      </label>
      {children}
      {hint && !error && <p className={fieldHintClass}>{hint}</p>}
      {error && (
        <p id={errorId} role="alert" className={fieldErrorClass}>
          {error}
        </p>
      )}
    </div>
  );
}

export function Divider() {
  return <div className={dividerClass} />;
}

export function fieldInputClass(hasError: boolean) {
  return cn(hasError && controlInvalidClass);
}
