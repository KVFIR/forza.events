import type {ReactNode} from 'react';
import {useTranslation} from 'react-i18next';
import {Calendar, Car, Users, type LucideIcon} from 'lucide-react';
import {RoadIcon} from '../icons/RoadIcon';
import type {ForzaEvent} from '../../lib/types';
import {formatCarDisplayName} from '../../lib/carDisplay';
import {piToClass} from '../../lib/pi';
import {cn} from '../../lib/cn';
import {sectionLabelClass} from '../ui/formStyles';
import {resolveOrganiserLabel} from '../../lib/organiser';

type Props = {
  event: ForzaEvent;
  when: string;
  convoyLeaderGamertag?: string | null;
  participantGamertags?: string[];
};

const piClassColor: Record<string, string> = {
  D: 'text-slate-400',
  C: 'text-yellow-400/90',
  B: 'text-orange-400/90',
  A: 'text-red-400/90',
  S1: 'text-violet-400/90',
  S2: 'text-fuchsia-400/90',
  R: 'text-amber-400/90',
};

/** Read-only event facts for Discord PIP / grid (no interactive controls). */
export function CompactEventFacts({
  event,
  when,
  convoyLeaderGamertag,
  participantGamertags = [],
}: Props) {
  const {t} = useTranslation();
  const tracks = event.trackCodes ?? [];
  const shownParticipants = participantGamertags.slice(0, 4);
  const extraParticipants = participantGamertags.length - shownParticipants.length;

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-white/[0.08] bg-card/80 px-3 py-2.5 text-left">
      <FactRow icon={Calendar} label={t('eventDetail.dateTime')} value={when} />
      <FactRow
        icon={Users}
        label={t('common.by')}
        value={resolveOrganiserLabel(event)}
        iconClassName="text-accent-purple-light"
      />
      {convoyLeaderGamertag ? (
        <FactRow
          icon={Users}
          label={t('eventDetail.convoyLeader')}
          value={convoyLeaderGamertag}
          iconClassName="text-accent-green"
        />
      ) : null}
      {tracks.length > 0 ? (
        <div className="flex gap-2.5">
          <RoadIcon className="mt-0.5 shrink-0 text-muted-light" />
          <div className="min-w-0 flex-1">
            <p className={sectionLabelClass}>{t('eventDetail.tracks')}</p>
            <p className="mt-0.5 font-mono text-xs tracking-wide text-slate-200">
              {tracks.join(' · ')}
            </p>
          </div>
        </div>
      ) : null}
      <div className="flex gap-2.5 pt-0.5">
        <Car className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-light" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className={sectionLabelClass}>{t('eventDetail.carRules')}</p>
          <CarRulesSummary event={event} />
        </div>
      </div>
      {shownParticipants.length > 0 ? (
        <FactRow
          icon={Users}
          label={t('eventDetail.participants')}
          value={
            <>
              {shownParticipants.join(', ')}
              {extraParticipants > 0
                ? ` ${t('discordLayout.participantsMore', {count: extraParticipants})}`
                : null}
            </>
          }
        />
      ) : null}
    </div>
  );
}

function FactRow({
  icon: Icon,
  label,
  value,
  mono,
  iconClassName,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  mono?: boolean;
  iconClassName?: string;
}) {
  return (
    <div className="flex gap-2.5">
      <Icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-light', iconClassName)} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className={sectionLabelClass}>{label}</p>
        <p className={cn('mt-0.5 text-xs text-slate-200', mono && 'font-mono tracking-wide')}>
          {value}
        </p>
      </div>
    </div>
  );
}

function CarRulesSummary({event}: {event: ForzaEvent}) {
  const {t} = useTranslation();

  if (event.carRuleMode === 'anything_goes') {
    const maxClass = piToClass(event.maxPi);
    const label = event.additionalCarRestrictions?.trim() || t('common.openBuild');
    return (
      <p className="mt-0.5 text-xs text-slate-200">
        {label}{' '}
        <span className={cn('font-bold tabular-nums', piClassColor[maxClass] ?? 'text-muted')}>
          · {maxClass} {event.maxPi}
        </span>
      </p>
    );
  }

  if (event.allowedCars.length === 0) {
    return <p className="mt-0.5 text-xs text-muted">{t('eventDetail.restrictedSoon')}</p>;
  }

  const shown = event.allowedCars.slice(0, 3);
  const extra = event.allowedCars.length - shown.length;

  return (
    <ul className="mt-1 space-y-0.5">
      {shown.map((c) => {
        const maxClass = piToClass(c.maxPi);
        return (
          <li key={c.carId} className="flex items-baseline justify-between gap-2 text-xs">
            <span className="truncate text-slate-200">{formatCarDisplayName(c)}</span>
            <span className={cn('shrink-0 font-bold tabular-nums', piClassColor[maxClass] ?? 'text-muted')}>
              {maxClass} {c.maxPi}
            </span>
          </li>
        );
      })}
      {extra > 0 ? (
        <li className="text-[10px] text-muted">{t('discordLayout.carsMore', {count: extra})}</li>
      ) : null}
    </ul>
  );
}
