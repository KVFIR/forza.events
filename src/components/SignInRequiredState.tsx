import {useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {busyLabel} from '../i18n/busyLabels';
import {startDiscordBrowserSignIn} from '../lib/discordBrowserSignIn';
import {supportsBrowserOAuth} from '../lib/runtime';
import {EmptyState} from './ui/EmptyState';

type Props = {
  description?: string;
  busy?: boolean;
  className?: string;
  /**
   * Discord Activity — retry embedded `authorize`.
   * Omit on browser web hosts: the component starts OAuth via `startDiscordBrowserSignIn()`.
   */
  onRetry?: () => void;
};

export function SignInRequiredState({
  description,
  busy = false,
  onRetry,
  className,
}: Props) {
  const {t} = useTranslation();
  const useBrowserSignIn = supportsBrowserOAuth() && !onRetry;

  const action = useBrowserSignIn
    ? {
        label: t('auth.signInWithDiscord'),
        onClick: () => startDiscordBrowserSignIn(),
      }
    : onRetry
      ? {
          label: busy ? busyLabel('signingIn') : t('common.tryAgain'),
          onClick: onRetry,
        }
      : undefined;

  const hasAction = Boolean(action);

  useEffect(() => {
    if (import.meta.env.DEV && !hasAction) {
      console.warn(
        'SignInRequiredState: no action. Pass onRetry in Activity, or render on a browser OAuth host.',
      );
    }
  }, [hasAction]);

  return (
    <EmptyState
      icon="🔐"
      title={t('auth.signInRequired')}
      description={
        description ??
        (useBrowserSignIn ? t('auth.browserSignInHint') : t('auth.signInDefault'))
      }
      action={action}
      className={className ?? 'min-h-[40vh] py-20'}
    />
  );
}
