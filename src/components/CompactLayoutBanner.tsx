import {useTranslation} from 'react-i18next';
import {Maximize2} from 'lucide-react';
import {useDiscordLayout} from '../context/DiscordLayoutContext';
import {cn} from '../lib/cn';

type Props = {
  className?: string;
  /** `footer` keeps content visible above the fold in PIP. */
  placement?: 'top' | 'footer';
};

/** Shown in PIP / grid — expand hint; primary content is read-only on each screen. */
export function CompactLayoutBanner({className, placement = 'top'}: Props) {
  const {t} = useTranslation();
  const {isCompact} = useDiscordLayout();

  if (!isCompact) return null;

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-left',
        placement === 'footer' ? 'mt-4' : 'mb-3',
        className,
      )}
      role="status"
    >
      <Maximize2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
      <p className="text-[10px] leading-snug text-muted">{t('discordLayout.compactHint')}</p>
    </div>
  );
}
