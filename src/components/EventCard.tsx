import {format} from 'date-fns';
import {dateFnsLocale} from '../i18n/dateLocale';
import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {Users} from 'lucide-react';
import type {EventAllowedCar, ForzaEvent} from '../lib/types';
import {eventTypeMeta} from '../lib/eventTypes';
import {cn} from '../lib/cn';
import {isDraftEvent} from '../lib/eventList';
import {formatLobbyCount} from '../lib/constants';
import {resolveOrganiserLabel} from '../lib/organiser';
import {defaultCoverPath} from '../lib/eventCovers';
import {piToClass} from '../lib/pi';
import {useAuth} from '../context/AuthContext';
import {EventCover} from './EventCover';

type Props = {
  event: ForzaEvent;
};

const classColor: Record<string, string> = {
  D: 'text-slate-400',
  C: 'text-yellow-400/90',
  B: 'text-orange-400/90',
  A: 'text-red-400/90',
  S1: 'text-violet-400/90',
  S2: 'text-fuchsia-400/90',
  R: 'text-amber-400/90',
};

const MAX_CARS_SHOWN = 4;

function CarList({cars}: {cars: EventAllowedCar[]}) {
  const shown = cars.slice(0, MAX_CARS_SHOWN);
  const extra = cars.length - shown.length;

  return (
    <div className="relative hidden min-[500px]:block shrink-0 text-left">
      <ul className="flex flex-col divide-y divide-white/[0.05]">
        {shown.map((car) => {
          const maxClass = piToClass(car.maxPi);

          return (
            <li
              key={car.carId}
              className="grid grid-cols-[minmax(0,1fr)_2.75rem] items-center gap-x-2.5 py-1 text-[10px] leading-tight first:pt-0 last:pb-0"
            >
              <span className="truncate font-medium text-slate-200">
                {car.make} {car.model}
              </span>
              <span
                className={cn(
                  'text-right font-bold tabular-nums',
                  classColor[maxClass] ?? 'text-muted',
                )}
              >
                {maxClass} {car.maxPi}
              </span>
            </li>
          );
        })}
      </ul>
      {extra > 0 && (
        <span className="pointer-events-none absolute left-0 top-full mt-1 text-[10px] leading-none text-muted">
          +{extra} more
        </span>
      )}
    </div>
  );
}

function OpenBuildSummary({event}: {event: ForzaEvent}) {
  const maxClass = piToClass(event.maxPi);
  const label = event.additionalCarRestrictions?.trim() || 'Open build';

  return (
    <div className="hidden min-[500px]:block shrink-0 text-left">
      <ul className="flex flex-col gap-1">
        <li className="grid grid-cols-[minmax(0,1fr)_2.75rem] items-center gap-x-2.5 text-[10px] leading-tight">
          <span className="truncate font-medium text-slate-200">{label}</span>
          <span
            className={cn(
              'text-right font-bold tabular-nums',
              classColor[maxClass] ?? 'text-muted',
            )}
          >
            {maxClass} {event.maxPi}
          </span>
        </li>
      </ul>
    </div>
  );
}

export function EventCard({event}: Props) {
  const when = format(new Date(event.startsAt), 'EEE d MMM · HH:mm', {locale: dateFnsLocale()});
  const draft = isDraftEvent(event);
  const ended = !draft && event.status === 'ended';
  const full =
    !draft && !ended && (event.status === 'full' || event.currentPlayers >= event.maxPlayers);
  const {user} = useAuth();
  const isHost = event.hostDiscordId === user.discordId;
  const organiserLabel = resolveOrganiserLabel(event);
  const coverSrc = event.coverImageUrl ?? defaultCoverPath(event.type);
  const [coverReady, setCoverReady] = useState(false);
  const cardTo = draft && isHost ? `/create?edit=${event.id}` : `/event/${event.id}`;

  useEffect(() => {
    setCoverReady(false);
  }, [coverSrc, event.id]);

  return (
    <article
      className={cn(
        'group relative transition-opacity duration-300 motion-reduce:transition-none',
        coverReady ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
      )}
    >
      <Link to={cardTo} className="block" tabIndex={coverReady ? undefined : -1}>
        <div
          className={cn(
            'relative min-h-[7.5rem] overflow-hidden rounded-xl border transition-all duration-200',
            draft
              ? 'border border-dashed border-b-0 border-sky-500/25 bg-sky-950/20 hover:border-sky-500/40'
              : ended
                ? 'border-white/[0.05] grayscale opacity-70 hover:opacity-80'
                : 'border-white/[0.08] hover:border-white/[0.12]',
          )}
        >
          <EventCover
            src={coverSrc}
            variant="card"
            className="absolute inset-0"
            imgClassName="transition-transform duration-300 group-hover:scale-[1.02]"
            onReady={() => setCoverReady(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-base/80 via-base/70 to-base/60" />
          <div className="absolute inset-0 bg-black/25 transition-colors duration-200 group-hover:bg-black/20" />

          <div className="relative flex items-center gap-3 px-4 pt-3 pb-4">
            <div className="min-w-0 flex-1 text-left">
              <h2 className="truncate text-lg font-semibold leading-tight text-white">
                {event.title}
              </h2>
              <p className="mt-0.5 truncate text-xs text-slate-400">
                {organiserLabel}
                {isHost && (
                  <span className="ml-1.5 text-[9px] font-bold uppercase tracking-widest text-accent-purple-light">
                    · You
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-muted">{when}</p>
              {draft ? (
                <p className="mt-1.5 text-[10px] font-bold uppercase tracking-widest text-sky-300/90">
                  Draft · not published
                </p>
              ) : (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-400">
                  <Users className="h-3 w-3 shrink-0" />
                  {formatLobbyCount(event.currentPlayers)}
                  {ended && (
                    <span className="ml-1 text-[9px] font-bold uppercase tracking-widest text-muted">
                      · Ended
                    </span>
                  )}
                  {full && (
                    <span className="ml-1 text-[9px] font-bold uppercase tracking-widest text-amber-300/90">
                      · Full
                    </span>
                  )}
                </p>
              )}
            </div>

            {event.carRuleMode === 'restricted_list' && event.allowedCars.length > 0 && (
              <CarList cars={event.allowedCars} />
            )}
            {event.carRuleMode === 'anything_goes' && <OpenBuildSummary event={event} />}
          </div>

          <div
            className={cn(
              'absolute inset-x-0 bottom-0 h-[2px]',
              eventTypeMeta(event.type).accentBar,
            )}
          />
        </div>
      </Link>
    </article>
  );
}
