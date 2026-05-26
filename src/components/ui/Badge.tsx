import {useTranslation} from 'react-i18next';
import type {CarRuleMode, EventType} from '../../lib/types';
import {eventTypeMeta} from '../../lib/eventTypes';
import {cn} from '../../lib/cn';
import {badgeBaseClass} from './formStyles';

type Props = {
  type: EventType;
  className?: string;
};

export function Badge({type, className}: Props) {
  useTranslation();
  const {badge, label} = eventTypeMeta(type);
  return (
    <span
      className={cn(
        badgeBaseClass,
        badge.bg,
        badge.border,
        badge.text,
        className,
      )}
    >
      {label}
    </span>
  );
}

export function CarRuleBadge({
  mode,
  className,
}: {
  mode: CarRuleMode;
  className?: string;
}) {
  const {t} = useTranslation();
  const restricted = mode === 'restricted_list';
  return (
    <span
      className={cn(
        badgeBaseClass,
        restricted
          ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200'
          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
        className,
      )}
    >
      {restricted ? t('eventStatus.restrictedList') : t('eventStatus.anythingGoes')}
    </span>
  );
}

type StatusProps = {
  status: 'open' | 'full' | 'live' | 'ended';
  className?: string;
};

const statusStyles: Record<
  StatusProps['status'],
  {border: string; text: string; bg: string; dot?: string}
> = {
  open: {
    border: 'border-accent-green/30',
    text: 'text-accent-green',
    bg: 'bg-accent-green/10',
    dot: 'bg-accent-green',
  },
  full: {
    border: 'border-amber-500/30',
    text: 'text-amber-300',
    bg: 'bg-amber-500/10',
  },
  live: {
    border: 'border-accent-green/40',
    text: 'text-accent-green',
    bg: 'bg-accent-green/15',
    dot: 'bg-accent-green',
  },
  ended: {
    border: 'border-slate-600/30',
    text: 'text-slate-500',
    bg: 'bg-slate-700/20',
  },
};

export function DraftBadge({className}: {className?: string}) {
  const {t} = useTranslation();
  return (
    <span
      className={cn(
        badgeBaseClass,
        'border-sky-500/35 bg-sky-500/10 text-sky-200',
        className,
      )}
    >
      {t('eventStatus.draft')}
    </span>
  );
}

export function StatusBadge({status, className}: StatusProps) {
  const {t} = useTranslation();
  const s = statusStyles[status];
  return (
    <span
      className={cn(
        badgeBaseClass,
        'gap-1.5',
        s.bg,
        s.border,
        s.text,
        className,
      )}
    >
      {s.dot && <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />}
      {t(`eventStatus.${status}`)}
    </span>
  );
}
