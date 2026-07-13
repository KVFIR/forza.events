import {Bell, BellOff} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {cn} from '../lib/cn';

type Props = {
  enabled: boolean;
  disabled?: boolean;
  onChange: (enabled: boolean) => void;
  className?: string;
};

const OPTIONS = [
  {value: true, Icon: Bell, labelKey: 'notifications.toggleOn' as const},
  {value: false, Icon: BellOff, labelKey: 'notifications.toggleOff' as const},
];

/** Profile DM notifications pill — matches LanguageToggle layout. */
export function NotificationBellToggle({enabled, disabled, onChange, className}: Props) {
  const {t} = useTranslation();

  return (
    <div
      className={cn(
        'inline-flex rounded-lg border border-white/[0.1] bg-black/25 p-0.5 shadow-sm backdrop-blur-md',
        className,
      )}
      role="group"
      aria-label={t('notifications.toggleOn')}
    >
      {OPTIONS.map((opt) => {
        const active = enabled === opt.value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            aria-pressed={active}
            aria-label={t(opt.labelKey)}
            disabled={disabled}
            onClick={() => {
              if (!active) onChange(opt.value);
            }}
            className={cn(
              'flex min-w-[2rem] items-center justify-center rounded-md px-2 py-1 transition-all duration-200',
              active
                ? 'bg-white/[0.12] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                : 'text-muted hover:text-slate-300',
              disabled && 'opacity-50',
            )}
          >
            <opt.Icon className="h-3.5 w-3.5" strokeWidth={active ? 2.25 : 2} />
          </button>
        );
      })}
    </div>
  );
}
