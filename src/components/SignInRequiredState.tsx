import {useTranslation} from 'react-i18next';
import {busyLabel} from '../i18n/busyLabels';
import {EmptyState} from './ui/EmptyState';

type Props = {
  description?: string;
  busy?: boolean;
  onRetry: () => void;
  className?: string;
};

export function SignInRequiredState({
  description,
  busy = false,
  onRetry,
  className,
}: Props) {
  const {t} = useTranslation();

  return (
    <EmptyState
      icon="🔐"
      title={t('auth.signInRequired')}
      description={description ?? t('auth.signInDefault')}
      action={{label: busy ? busyLabel('signingIn') : t('common.tryAgain'), onClick: onRetry}}
      className={className ?? 'min-h-[40vh] py-20'}
    />
  );
}
