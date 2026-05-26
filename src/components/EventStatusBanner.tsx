import {cn} from '../lib/cn';
import {Alert, type AlertVariant} from './ui/Alert';

type Variant = 'draft' | 'host-in-progress' | 'registration-closed' | 'cancelled';

const copy: Record<Variant, {title: string; body: string; alert: AlertVariant}> = {
  draft: {
    title: 'Draft',
    body: 'Only you can see this event until you publish it.',
    alert: 'draft',
  },
  'host-in-progress': {
    title: 'Event in progress',
    body: 'Editing is locked. Submit results when the event is finished, or cancel if it will not run.',
    alert: 'warning',
  },
  'registration-closed': {
    title: 'Registration closed',
    body: 'This event has started. New players cannot join.',
    alert: 'info',
  },
  cancelled: {
    title: 'Event cancelled',
    body: 'This event was cancelled by the host.',
    alert: 'info',
  },
};

type Props = {
  variant: Variant;
  className?: string;
};

export function EventStatusBanner({variant, className}: Props) {
  const {title, body, alert} = copy[variant];
  return (
    <Alert variant={alert} title={title} className={cn('mt-3 py-2.5 text-sm', className)}>
      {body}
    </Alert>
  );
}
