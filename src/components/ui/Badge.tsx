import {useTranslation} from 'react-i18next';
import {Star} from 'lucide-react';
import type {CarRuleMode, EventType} from '../../lib/types';
import {eventTypeMeta} from '../../lib/eventTypes';
import {eventGameMeta, normalizeEventGame, type ForzaGame} from '../../lib/eventGames';
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

export function GameBadge({
  game,
  className,
}: {
  game: ForzaGame;
  className?: string;
}) {
  const {t} = useTranslation();
  const g = normalizeEventGame(game);
  const meta = eventGameMeta(g);
  return (
    <span
      className={cn(badgeBaseClass, meta.badge.bg, meta.badge.border, meta.badge.text, className)}
    >
      {t(`eventGames.${g}Full`)}
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
          ? 'border-cyan-500/20 bg-cyan-500/[0.07] text-cyan-200/80'
          : 'border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-200/80',
        className,
      )}
    >
      {restricted ? t('eventStatus.restrictedList') : t('eventStatus.anythingGoes')}
    </span>
  );
}

export function RankedBadge({className}: {className?: string}) {
  const {t} = useTranslation();
  return (
    <span
      className={cn(
        badgeBaseClass,
        'gap-1 border-amber-500/25 bg-amber-500/[0.08] text-amber-200/90',
        className,
      )}
    >
      <Star className="h-2.5 w-2.5 shrink-0 fill-current" aria-hidden />
      {t('eventStatus.ranked')}
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
    border: 'border-accent-green/20',
    text: 'text-accent-green/80',
    bg: 'bg-accent-green/[0.07]',
    dot: 'bg-accent-green/70',
  },
  full: {
    border: 'border-amber-500/20',
    text: 'text-amber-300/80',
    bg: 'bg-amber-500/[0.07]',
  },
  live: {
    border: 'border-accent-green/25',
    text: 'text-accent-green/85',
    bg: 'bg-accent-green/10',
    dot: 'bg-accent-green/80',
  },
  ended: {
    border: 'border-slate-600/20',
    text: 'text-slate-500/80',
    bg: 'bg-slate-700/10',
  },
};

export function DraftBadge({className}: {className?: string}) {
  const {t} = useTranslation();
  return (
    <span
      className={cn(
        badgeBaseClass,
        'border-sky-500/20 bg-sky-500/[0.07] text-sky-200/80',
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
        'gap-1',
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
