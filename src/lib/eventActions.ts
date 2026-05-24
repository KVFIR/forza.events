import type {ButtonVariant} from '../components/ui/Button';

/** Results = primary, Host = secondary, Join = Open, Leave = Road, Full = Full. */
export function participationButtonVariant(
  canEnterResults: boolean,
  isHost: boolean,
  isJoined: boolean,
  isFull: boolean,
): ButtonVariant {
  if (canEnterResults) return 'primary';
  if (isHost) return 'secondary';
  if (isFull && !isJoined) return 'full';
  if (isJoined) return 'road';
  return 'open';
}

export function participationButtonLabel(
  canEnterResults: boolean,
  isHost: boolean,
  isJoined: boolean,
  isFull: boolean,
  joining?: boolean,
): string {
  if (joining) return '…';
  if (canEnterResults) return 'Results';
  if (isHost) return 'Edit';
  if (isJoined) return 'Leave';
  if (isFull) return 'Full';
  return 'Join';
}
