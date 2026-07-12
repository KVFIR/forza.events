import {Compass, PlusCircle, Users} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {startDiscordBrowserSignIn} from '../lib/discordBrowserSignIn';
import {cn} from '../lib/cn';
import {buttonBaseClass, buttonSizeClass} from './ui/buttonStyles';
import {Logo} from './ui/Logo';

function DiscordMark({className}: {className?: string}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037 12.3 12.3 0 0 0-.608 1.25 18.27 18.27 0 0 0-5.487 0 11.64 11.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

const featureIcons = [Compass, Users, PlusCircle] as const;

type Props = {
  className?: string;
};

/** Full-screen browser entry — no app chrome (navbar, browse, etc.). */
export function BrowserSignInScreen({className}: Props) {
  const {t} = useTranslation();
  const features = t('auth.browserSignIn.features', {returnObjects: true}) as string[];

  return (
    <div
      className={cn(
        'flex min-h-screen flex-col items-center justify-center px-6 py-12 text-center',
        className,
      )}
    >
      <div className="w-full max-w-lg space-y-8">
        <div className="space-y-5">
          <Logo size="lg" className="justify-center" />
          <div className="space-y-2">
            <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
              {t('auth.browserSignIn.title')}
            </h1>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-muted">
              {t('auth.browserSignIn.subtitle')}
            </p>
          </div>
        </div>

        <ul className="grid gap-2 sm:grid-cols-3 sm:gap-3">
          {features.map((label, index) => {
            const Icon = featureIcons[index] ?? Compass;
            return (
              <li
                key={label}
                className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-left sm:flex-col sm:items-center sm:gap-2 sm:px-3 sm:py-4 sm:text-center"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-purple/15 text-accent-purple-light">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="text-xs font-medium leading-snug text-slate-300">{label}</span>
              </li>
            );
          })}
        </ul>

        <div className="space-y-4">
          <button
            type="button"
            onClick={() => startDiscordBrowserSignIn()}
            className={cn(
              buttonBaseClass,
              buttonSizeClass.default,
              'mx-auto w-full max-w-xs bg-[#5865F2] font-semibold text-white shadow-lg shadow-[#5865F2]/20',
              'hover:bg-[#4752C4] active:bg-[#3C45A5]',
            )}
          >
            <DiscordMark className="h-5 w-5" />
            {t('auth.browserSignIn.cta')}
          </button>
          <p className="text-[11px] leading-relaxed text-muted/80">
            {t('auth.browserSignIn.disclaimer')}
          </p>
        </div>

        <p className="text-xs text-muted">
          <a href="/terms" className="transition-colors hover:text-white">
            {t('legal.termsLink')}
          </a>
          <span aria-hidden="true"> · </span>
          <a href="/privacy" className="transition-colors hover:text-white">
            {t('legal.privacyLink')}
          </a>
        </p>
      </div>
    </div>
  );
}
