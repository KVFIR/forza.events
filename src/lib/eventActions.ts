import i18n from '../i18n';
import type {ButtonVariant} from '../components/ui/Button';

export type ParticipationAction = 'joining' | 'leaving' | null;

/** Join / leave / closed — hosts use Edit or post-start actions, never Join. */
export function participationButtonVariant(
  joined: boolean,
  registrationOpen: boolean,
  isFull: boolean,
  canLeave: boolean,
  action: ParticipationAction = null,
  isConvoyLeader = false,
): ButtonVariant {
  if (action === 'leaving') return 'leave';
  if (action === 'joining') return 'open';
  if (isConvoyLeader) return 'secondary';
  if (joined && !canLeave) return 'secondary';
  if (isFull && registrationOpen && !joined) return 'full';
  if (joined) return 'leave';
  if (registrationOpen) return 'open';
  return 'secondary';
}

export function participationButtonLabel(
  joined: boolean,
  registrationOpen: boolean,
  isFull: boolean,
  canLeave: boolean,
  isConvoyLeader = false,
): string {
  if (isConvoyLeader) return i18n.t('participation.convoyLeader');
  if (joined && !canLeave) return i18n.t('participation.registered');
  if (joined) return i18n.t('participation.leave');
  if (!registrationOpen) return i18n.t('participation.closed');
  if (isFull) return i18n.t('participation.full');
  return i18n.t('participation.join');
}
