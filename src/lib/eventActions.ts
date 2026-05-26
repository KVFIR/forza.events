import type {ButtonVariant} from '../components/ui/Button';

/** Join / leave / closed — hosts use Edit or post-start actions, never Join. */
export function participationButtonVariant(
  joined: boolean,
  registrationOpen: boolean,
  isFull: boolean,
): ButtonVariant {
  if (isFull && registrationOpen && !joined) return 'full';
  if (joined) return 'road';
  if (registrationOpen) return 'open';
  return 'secondary';
}

export function participationButtonLabel(
  joined: boolean,
  registrationOpen: boolean,
  isFull: boolean,
): string {
  if (joined) return 'Leave';
  if (!registrationOpen) return 'Closed';
  if (isFull) return 'Full';
  return 'Join';
}
