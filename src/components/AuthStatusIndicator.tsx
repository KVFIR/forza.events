import {useTranslation} from 'react-i18next';
import {useAuth} from '../context/AuthContext';
import {resolveAuthStatus, type AuthStatusTone} from '../lib/authStatus';
import {canRetryDiscordActivityAuth} from '../lib/discord';
import {startDiscordBrowserSignIn} from '../lib/discordBrowserSignIn';
import {isLocalDevHost, supportsBrowserOAuth} from '../lib/runtime';
import {cn} from '../lib/cn';
import {statusPillClass} from './ui/formStyles';

const dotTone: Record<AuthStatusTone, string> = {
  loading: 'bg-amber-400/90 animate-pulse',
  online: 'bg-accent-green shadow-[0_0_6px_rgba(16,185,129,0.9)]',
  warning: 'bg-amber-400/90',
  muted: 'bg-slate-500/80',
};

export function AuthStatusIndicator({className}: {className?: string}) {
  const {t} = useTranslation();
  const {isConfigured, isSignedIn, isStandalone, loading, authRetrying, retryDiscordAuth} = useAuth();
  const busy = loading || authRetrying;
  const {label, tone, retryable, browserSignIn} = resolveAuthStatus({
    isConfigured,
    loading: busy,
    isSignedIn,
    isStandalone,
    supportsBrowserOAuth: supportsBrowserOAuth(),
    isLocalDev: isLocalDevHost(),
  });
  const canRetry = Boolean(retryable && canRetryDiscordActivityAuth() && !busy);
  const canBrowserSignIn = Boolean(browserSignIn && isConfigured && !busy);

  const content = (
    <>
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', dotTone[tone])} />
      </span>
      <span className="text-[10px] font-medium tracking-wide text-muted-light">{label}</span>
    </>
  );

  if (canBrowserSignIn) {
    return (
      <button
        type="button"
        onClick={() => startDiscordBrowserSignIn()}
        className={cn(
          statusPillClass,
          'cursor-pointer transition-colors hover:border-white/20 hover:bg-white/[0.07] active:bg-white/[0.1]',
          className,
        )}
        aria-label={t('auth.signInWithDiscord')}
      >
        {content}
      </button>
    );
  }

  if (canRetry) {
    return (
      <button
        type="button"
        onClick={() => void retryDiscordAuth()}
        className={cn(
          statusPillClass,
          'cursor-pointer transition-colors hover:border-white/20 hover:bg-white/[0.07] active:bg-white/[0.1]',
          className,
        )}
        aria-label={t('auth.signInAgainAria', {label})}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={cn(statusPillClass, className)} role="status" aria-live="polite" aria-label={label}>
      {content}
    </div>
  );
}
