import {useTranslation} from 'react-i18next';
import {cn} from '../lib/cn';
import {Alert, type AlertVariant} from './ui/Alert';
import {eventDetailHintClass, eventDetailStatusHintClass} from './eventDetailHintStyles';

type Variant = 'draft' | 'host-in-progress' | 'registration-closed' | 'cancelled';

const alertByVariant: Record<Variant, AlertVariant> = {
  draft: 'draft',
  'host-in-progress': 'warning',
  'registration-closed': 'info',
  cancelled: 'info',
};

const copyKeys: Record<Variant, {title: string; body: string}> = {
  draft: {title: 'statusBanner.draftTitle', body: 'statusBanner.draftBody'},
  'host-in-progress': {
    title: 'statusBanner.inProgressTitle',
    body: 'statusBanner.inProgressBody',
  },
  'registration-closed': {
    title: 'statusBanner.registrationClosedTitle',
    body: 'statusBanner.registrationClosedBody',
  },
  cancelled: {title: 'statusBanner.cancelledTitle', body: 'statusBanner.cancelledBody'},
};

type Props = {
  variant: Variant;
  className?: string;
};

export function EventStatusBanner({variant, className}: Props) {
  const {t} = useTranslation();
  const keys = copyKeys[variant];
  const infoOutline = alertByVariant[variant] === 'info';
  return (
    <Alert
      variant={alertByVariant[variant]}
      title={t(keys.title)}
      className={cn(
        'mt-3',
        infoOutline ? eventDetailHintClass : eventDetailStatusHintClass,
        className,
      )}
    >
      {t(keys.body)}
    </Alert>
  );
}
