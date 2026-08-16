import {Bell, BellOff} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {cn} from '../lib/cn';

type Props = {
  enabled: boolean;
  disabled?: boolean;
  onChange: (enabled: boolean) => void;
  className?: string;
  label?: string;
  switchOnLabel?: string;
  switchOffLabel?: string;
};

/** Profile DM notifications — labeled row + switch inside profile card footer. */
export function NotificationBellToggle({
  enabled,
  disabled,
  onChange,
  className,
  label,
  switchOnLabel,
  switchOffLabel,
}: Props) {
  const {t} = useTranslation();
  const Icon = enabled ? Bell : BellOff;
  const rowLabel = label ?? t('notifications.profileLabel');
  const ariaOn = switchOnLabel ?? t('notifications.toggleOn');
  const ariaOff = switchOffLabel ?? t('notifications.toggleOff');

  return (
    <label
      className={cn(
        'flex cursor-pointer items-center justify-between gap-3',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
    >
      <span className="flex min-w-0 flex-1 items-center gap-2.5">
        <Icon
          aria-hidden
          className={cn(
            'h-3.5 w-3.5 shrink-0',
            enabled ? 'text-slate-300' : 'text-muted',
          )}
          strokeWidth={enabled ? 2.25 : 2}
        />
        <span className="min-w-0 text-xs leading-snug text-slate-300">
          {rowLabel}
        </span>
      </span>
      <span className="relative inline-flex h-5 w-9 shrink-0">
        <input
          type="checkbox"
          role="switch"
          checked={enabled}
          disabled={disabled}
          aria-label={enabled ? ariaOn : ariaOff}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className={cn(
            'absolute inset-0 rounded-full border border-white/[0.12] bg-black/30 transition-colors duration-200',
            'peer-checked:border-white/25 peer-checked:bg-white/15',
            'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-white/30',
          )}
        />
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
            'peer-checked:translate-x-4',
          )}
        />
      </span>
    </label>
  );
}
