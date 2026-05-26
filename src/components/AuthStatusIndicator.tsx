import {useAuth} from '../context/AuthContext';
import {resolveAuthStatus, type AuthStatusTone} from '../lib/authStatus';
import {canRetryDiscordActivityAuth} from '../lib/discord';
import {cn} from '../lib/cn';

const dotTone: Record<AuthStatusTone, string> = {
  loading: 'bg-amber-400/90 animate-pulse',
  online: 'bg-accent-green shadow-[0_0_6px_rgba(16,185,129,0.9)]',
  warning: 'bg-amber-400/90',
  muted: 'bg-slate-500/80',
};

const pillClassName =
  'inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1';

export function AuthStatusIndicator({className}: {className?: string}) {
  const {isConfigured, isSignedIn, isStandalone, loading, authRetrying, retryDiscordAuth} = useAuth();
  const busy = loading || authRetrying;
  const {label, tone, retryable} = resolveAuthStatus({
    isConfigured,
    loading: busy,
    isSignedIn,
    isStandalone,
  });
  const canRetry = Boolean(retryable && canRetryDiscordActivityAuth() && !busy);

  const content = (
    <>
      <span className="relative flex h-1.5 w-1.5 shrink-0">
        <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', dotTone[tone])} />
      </span>
      <span className="text-[10px] font-medium tracking-wide text-muted-light">{label}</span>
    </>
  );

  if (canRetry) {
    return (
      <button
        type="button"
        onClick={() => void retryDiscordAuth()}
        className={cn(
          pillClassName,
          'cursor-pointer transition-colors hover:border-white/20 hover:bg-white/[0.07] active:bg-white/[0.1]',
          className,
        )}
        aria-label={`${label}. Tap to sign in again.`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={cn(pillClassName, className)} role="status" aria-live="polite" aria-label={label}>
      {content}
    </div>
  );
}
