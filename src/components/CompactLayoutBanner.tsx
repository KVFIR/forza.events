import {useTranslation} from 'react-i18next';
import {Maximize2} from 'lucide-react';
import {useDiscordLayout} from '../context/DiscordLayoutContext';
import {cn} from '../lib/cn';

type Props = {
  className?: string;
};

/** Shown in PIP / grid — reminds users the full UI needs a focused Activity window. */
export function CompactLayoutBanner({className}: Props) {
  const {t} = useTranslation();
  const {isCompact} = useDiscordLayout();

  if (!isCompact) return null;

  return (
    <div
      className={cn(
        'mb-3 flex items-start gap-2 rounded-lg border border-accent-purple/25 bg-accent-purple/10 px-3 py-2 text-left',
        className,
      )}
      role="status"
    >
      <Maximize2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-purple-light" aria-hidden />
      <p className="text-[11px] leading-snug text-slate-300">{t('discordLayout.compactHint')}</p>
    </div>
  );
}
