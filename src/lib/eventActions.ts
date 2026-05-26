import i18n from '../i18n';
import type {ButtonVariant} from '../components/ui/Button';

/** Join / leave / closed — hosts use Edit or post-start actions, never Join. */
export function participationButtonVariant(
  joined: boolean,
  registrationOpen: boolean,
  isFull: boolean,
): ButtonVariant {
  if (isFull && registrationOpen && !joined) return 'full';
  if (joined) return 'leave';
  if (registrationOpen) return 'open';
  return 'secondary';
}

export function participationButtonLabel(
  joined: boolean,
  registrationOpen: boolean,
  isFull: boolean,
): string {
  if (joined) return i18n.t('participation.leave');
  if (!registrationOpen) return i18n.t('participation.closed');
  if (isFull) return i18n.t('participation.full');
  return i18n.t('participation.join');
}
