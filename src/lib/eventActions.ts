import i18n from '../i18n';
import type {ButtonVariant} from '../components/ui/Button';

export type ParticipationAction = 'joining' | 'leaving' | null;

/** Waitlist flags: `onWaitlist` = viewer is queued; `willWaitlist` = a fresh join would queue. */
export type WaitlistFlags = {onWaitlist?: boolean; willWaitlist?: boolean};

/** Join / leave / closed — hosts use Edit or post-start actions, never Join. */
export function participationButtonVariant(
  joined: boolean,
  registrationOpen: boolean,
  _isFull: boolean,
  canLeave: boolean,
  action: ParticipationAction = null,
  isConvoyLeader = false,
  waitlist: WaitlistFlags = {},
): ButtonVariant {
  if (action === 'leaving') return 'leave';
  if (action === 'joining') return 'open';
  if (isConvoyLeader) return 'secondary';
  if (waitlist.onWaitlist) return canLeave ? 'leave' : 'secondary';
  if (joined && !canLeave) return 'secondary';
  if (joined) return 'leave';
  if (registrationOpen) return 'open';
  return 'secondary';
}

export function participationButtonLabel(
  joined: boolean,
  registrationOpen: boolean,
  _isFull: boolean,
  canLeave: boolean,
  isConvoyLeader = false,
  waitlist: WaitlistFlags = {},
): string {
  if (isConvoyLeader) return i18n.t('participation.convoyLeader');
  if (waitlist.onWaitlist) {
    return canLeave ? i18n.t('participation.leaveWaitlist') : i18n.t('participation.waitlisted');
  }
  if (joined && !canLeave) return i18n.t('participation.registered');
  if (joined) return i18n.t('participation.leave');
  if (!registrationOpen) return i18n.t('participation.closed');
  if (waitlist.willWaitlist) return i18n.t('participation.joinWaitlist');
  return i18n.t('participation.join');
}
