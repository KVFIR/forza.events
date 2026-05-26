import {EmptyState} from './ui/EmptyState';

type Props = {
  description?: string;
  busy?: boolean;
  onRetry: () => void;
  className?: string;
};

export function SignInRequiredState({
  description = 'Connect your Discord account to use this feature.',
  busy = false,
  onRetry,
  className,
}: Props) {
  return (
    <EmptyState
      icon="🔐"
      title="Sign in required"
      description={description}
      action={{label: busy ? 'Signing in…' : 'Try again', onClick: onRetry}}
      className={className ?? 'min-h-[40vh] py-20'}
    />
  );
}
