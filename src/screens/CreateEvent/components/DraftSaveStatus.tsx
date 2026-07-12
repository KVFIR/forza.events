import {useTranslation} from 'react-i18next';
import {cn} from '../../../lib/cn';
import type {DraftSyncStatus} from '../../../lib/createEventPersistence';

type DraftSaveStatusProps = {
  status: DraftSyncStatus;
  className?: string;
};

export function DraftSaveStatus({status, className}: DraftSaveStatusProps) {
  const {t} = useTranslation();

  if (status === 'idle') return null;

  const label =
    status === 'dirty'
      ? t('create.draftStatusUnsaved')
      : status === 'saving'
        ? t('create.draftStatusSaving')
        : status === 'saved'
          ? t('create.draftStatusSaved')
          : t('create.draftStatusError');

  return (
    <p
      className={cn(
        'mb-4 text-center text-xs font-medium tracking-wide',
        status === 'error' ? 'text-red-300/90' : 'text-muted',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      {label}
    </p>
  );
}
