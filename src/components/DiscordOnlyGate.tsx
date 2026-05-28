import {useTranslation} from 'react-i18next';
import {cn} from '../lib/cn';
import {buildDiscordAppAddUrl} from '../lib/discordInstall';
import {buttonBaseClass, buttonSizeClass} from './ui/buttonStyles';
import {Logo} from './ui/Logo';

/**
 * Shown when the deploy URL is opened in a normal browser tab.
 * MVP is Discord Activity–only; browser web needs a separate Discord app (deferred).
 */
export function DiscordOnlyGate() {
  const {t} = useTranslation();
  const discordAddUrl = buildDiscordAppAddUrl();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="max-w-md space-y-4">
        <Logo size="wordmark" className="justify-center" />
        <h1 className="text-lg font-semibold text-white">{t('discordGate.title')}</h1>
        <p className="text-sm leading-relaxed text-muted">{t('discordGate.body')}</p>
        {discordAddUrl ? (
          <a
            href={discordAddUrl}
            rel="noopener noreferrer"
            className={cn(
              buttonBaseClass,
              buttonSizeClass.default,
              'border border-accent-purple/35 bg-accent-purple/10 font-semibold text-accent-purple-light',
              'hover:border-accent-purple/50 hover:bg-accent-purple/15 hover:text-white',
            )}
          >
            {t('discordGate.addInDiscord')}
          </a>
        ) : null}
        <p className="text-xs text-muted">
          <a href="/terms" className="hover:text-white">
            {t('legal.termsLink')}
          </a>
          <span aria-hidden="true"> · </span>
          <a href="/privacy" className="hover:text-white">
            {t('legal.privacyLink')}
          </a>
        </p>
      </div>
    </div>
  );
}
