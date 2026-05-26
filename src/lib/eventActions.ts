import type {ButtonVariant} from '../components/ui/Button';

/** Join / leave / closed — not used for host post-start actions (Results / Cancel). */
export function participationButtonVariant(
  isHost: boolean,
  canEdit: boolean,
  joined: boolean,
  registrationOpen: boolean,
  isFull: boolean,
): ButtonVariant {
  if (isHost && canEdit) return 'secondary';
  if (isFull && registrationOpen && !joined) return 'full';
  if (joined) return 'road';
  if (registrationOpen) return 'open';
  return 'secondary';
}

export function participationButtonLabel(
  isHost: boolean,
  canEdit: boolean,
  joined: boolean,
  registrationOpen: boolean,
  isFull: boolean,
): string {
  if (isHost && canEdit) return 'Edit';
  if (joined) return 'Leave';
  if (!registrationOpen) return 'Closed';
  if (isFull) return 'Full';
  return 'Join';
}
