import {format} from 'date-fns';
import {dateFnsLocale} from '../../i18n/dateLocale';
import {useTranslation} from 'react-i18next';
import {Users} from 'lucide-react';
import type {ForzaEvent} from '../../lib/types';
import {eventTypeLabel} from '../../lib/eventTypes';
import {formatLobbyCount} from '../../lib/constants';
import {resolveOrganiserLabel} from '../../lib/organiser';
import {isDraftEvent} from '../../lib/eventList';
import {useResolveEventDisplayStatus} from '../../hooks/useResolveEventDisplayStatus';
import {cn} from '../../lib/cn';

type Props = {
  event: ForzaEvent;
  joined?: boolean;
  host?: boolean;
  className?: string;
};

/** Non-interactive event row for compact layout lists. */
export function CompactEventRow({event, joined, host, className}: Props) {
  const {t} = useTranslation();
  const when = format(new Date(event.startsAt), 'EEE d MMM · HH:mm', {locale: dateFnsLocale()});
  const draft = isDraftEvent(event);
  const displayStatus = useResolveEventDisplayStatus(event);

  return (
    <div
      className={cn(
        'rounded-lg border border-white/[0.08] bg-card/90 px-3 py-2.5 text-left',
        draft && 'border-dashed border-sky-500/25 bg-sky-950/20',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-semibold text-white">{event.title}</p>
        <span className="shrink-0 text-[9px] font-bold uppercase tracking-widest text-muted">
          {eventTypeLabel(event.type)}
        </span>
      </div>
      <p className="mt-0.5 truncate text-[11px] text-slate-400">
        {when} · {resolveOrganiserLabel(event)}
      </p>
      <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[10px] text-slate-400">
        <Users className="h-3 w-3 shrink-0" aria-hidden />
        {formatLobbyCount(event.currentPlayers)}
        {draft ? (
          <span className="font-bold uppercase tracking-widest text-sky-300/90">
            · {t('eventStatus.draft')}
          </span>
        ) : displayStatus === 'live' ? (
          <span className="font-bold uppercase tracking-widest text-accent-green">
            · {t('eventStatus.live')}
          </span>
        ) : displayStatus === 'full' ? (
          <span className="font-bold uppercase tracking-widest text-amber-300/90">
            · {t('eventStatus.full')}
          </span>
        ) : null}
        {joined ? (
          <span className="font-bold uppercase tracking-widest text-accent-purple-light">
            · {t('discordLayout.joined')}
          </span>
        ) : null}
        {host ? (
          <span className="font-bold uppercase tracking-widest text-accent-purple-light">
            · {t('common.host')}
          </span>
        ) : null}
      </p>
    </div>
  );
}
