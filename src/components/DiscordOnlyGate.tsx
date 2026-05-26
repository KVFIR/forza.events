import {useTranslation} from 'react-i18next';
import {Logo} from './ui/Logo';

/**
 * Shown when the deploy URL is opened in a normal browser tab.
 * MVP is Discord Activity–only; browser web needs a separate Discord app (deferred).
 */
export function DiscordOnlyGate() {
  const {t} = useTranslation();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="max-w-md space-y-4">
        <Logo size="wordmark" className="justify-center" />
        <h1 className="text-lg font-semibold text-white">{t('discordGate.title')}</h1>
        <p className="text-sm leading-relaxed text-muted">{t('discordGate.body')}</p>
      </div>
    </div>
  );
}
