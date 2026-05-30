import i18n from '../i18n';

export type AuthStatusTone = 'loading' | 'online' | 'warning' | 'muted';

export type AuthStatusDisplay = {
  label: string;
  tone: AuthStatusTone;
  /** Discord Activity auth failed — user can tap to retry. */
  retryable?: boolean;
  /** Localhost browser tab — show Sign in with Discord. */
  browserSignIn?: boolean;
};

type AuthStatusInput = {
  isConfigured: boolean;
  loading: boolean;
  isSignedIn: boolean;
  isStandalone: boolean;
  isLocalDev: boolean;
};

export function resolveAuthStatus({
  isConfigured,
  loading,
  isSignedIn,
  isStandalone,
  isLocalDev,
}: AuthStatusInput): AuthStatusDisplay {
  if (!isConfigured) {
    return {label: i18n.t('auth.status.setupRequired'), tone: 'warning'};
  }

  if (loading) {
    return isStandalone
      ? {label: i18n.t('auth.status.loading'), tone: 'loading'}
      : {label: i18n.t('auth.status.connecting'), tone: 'loading'};
  }

  if (isSignedIn) {
    return isStandalone
      ? {label: i18n.t('auth.status.local'), tone: 'online'}
      : {label: i18n.t('auth.status.online'), tone: 'online'};
  }

  if (!isStandalone) {
    return {
      label: i18n.t('auth.status.signInRequired'),
      tone: 'warning',
      retryable: true,
    };
  }

  if (isLocalDev) {
    return {
      label: i18n.t('auth.status.notSignedIn'),
      tone: 'muted',
      browserSignIn: true,
    };
  }

  return {label: i18n.t('auth.status.notSignedIn'), tone: 'muted'};
}
