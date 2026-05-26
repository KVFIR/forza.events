import type {ButtonVariant} from '../components/ui/Button';

/** Results = primary, Host edit/cancel = secondary, Join = Open, Leave = Road, Full = Full. */
export function participationButtonVariant(
  canEnterResults: boolean,
  canCancel: boolean,
  isHost: boolean,
  canEdit: boolean,
  isJoined: boolean,
  isFull: boolean,
): ButtonVariant {
  if (canEnterResults || canCancel) return 'primary';
  if (isHost && canEdit) return 'secondary';
  if (isFull && !isJoined) return 'full';
  if (isJoined) return 'road';
  return 'open';
}

export function participationButtonLabel(
  canEnterResults: boolean,
  canCancel: boolean,
  isHost: boolean,
  canEdit: boolean,
  isJoined: boolean,
  isFull: boolean,
): string {
  if (canEnterResults) return 'Results';
  if (canCancel) return 'Cancel event';
  if (isHost && canEdit) return 'Edit';
  if (isJoined) return 'Leave';
  if (isFull) return 'Full';
  return 'Join';
}
