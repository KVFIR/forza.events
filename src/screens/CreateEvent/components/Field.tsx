import type {ReactNode} from 'react';
import {useTranslation} from 'react-i18next';
import {cn} from '../../../lib/cn';
import {
  controlInvalidClass,
  dividerClass,
  fieldErrorClass,
  fieldHintClass,
  fieldLabelClass,
  formSectionPanelClass,
  formSectionTitleClass,
} from '../../../components/ui/formStyles';

export function Field({
  title,
  htmlFor,
  hint,
  error,
  optional,
  children,
  className,
}: {
  title: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const {t} = useTranslation();
  const errorId = error && htmlFor ? `${htmlFor}-error` : undefined;
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className={fieldLabelClass}>
          {title}
        </label>
        {optional ? (
          <span className="shrink-0 text-[10px] font-medium normal-case tracking-normal text-muted">
            {t('common.optional')}
          </span>
        ) : null}
      </div>
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

export function FormSection({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(formSectionPanelClass, 'px-4 py-4', className)}>
      {title ? <h2 className={cn(formSectionTitleClass, 'mb-4')}>{title}</h2> : null}
      <div className="space-y-5">{children}</div>
    </section>
  );
}

export function Divider() {
  return <div className={dividerClass} />;
}

export function fieldInputClass(hasError: boolean) {
  return cn(hasError && controlInvalidClass);
}
