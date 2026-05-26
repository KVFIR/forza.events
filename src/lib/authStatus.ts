export type AuthStatusTone = 'loading' | 'online' | 'warning' | 'muted';

export type AuthStatusDisplay = {
  label: string;
  tone: AuthStatusTone;
  /** Discord Activity auth failed — user can tap to retry. */
  retryable?: boolean;
};

type AuthStatusInput = {
  isConfigured: boolean;
  loading: boolean;
  isSignedIn: boolean;
  isStandalone: boolean;
};

export function resolveAuthStatus({
  isConfigured,
  loading,
  isSignedIn,
  isStandalone,
}: AuthStatusInput): AuthStatusDisplay {
  if (!isConfigured) {
    return {label: 'Setup required', tone: 'warning'};
  }

  if (loading) {
    return isStandalone
      ? {label: 'Loading', tone: 'loading'}
      : {label: 'Connecting', tone: 'loading'};
  }

  if (isSignedIn) {
    return isStandalone ? {label: 'Local', tone: 'online'} : {label: 'Online', tone: 'online'};
  }

  if (!isStandalone) {
    return {label: 'Sign-in required', tone: 'warning', retryable: true};
  }

  return {label: 'Not signed in', tone: 'muted'};
}
