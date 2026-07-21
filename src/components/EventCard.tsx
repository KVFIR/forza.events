import {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Link, useLocation} from 'react-router-dom';
import {Users} from 'lucide-react';
import type {ParticipantEventResult} from '../lib/participantResults';
import {participantResultLabel} from '../lib/participantResultsLabel';
import type {EventAllowedCar, ForzaEvent} from '../lib/types';
import {eventTypeMeta} from '../lib/eventTypes';
import {cn} from '../lib/cn';
import {isDraftEvent} from '../lib/eventList';
import {formatLobbyCount} from '../lib/constants';
import {totalCapacity} from '../lib/eventSpec';
import {resolveOrganiserLabel} from '../lib/organiser';
import {formatEventStart} from '../lib/datetime';
import {defaultCoverPath} from '../lib/eventCovers';
import {formatCarListDisplayNames} from '../lib/carDisplay';
import {formatOpenBuildCarRulesDisplay, openBuildHasDisplayRules} from '../lib/carRules';
import {piToClass} from '../lib/pi';
import {normalizeEventGame} from '../lib/eventGames';
import {GameBadge} from './ui/Badge';
import {useAuth} from '../context/AuthContext';
import {useResolveEventDisplayStatus} from '../hooks/useResolveEventDisplayStatus';
import {EventCover} from './EventCover';

type Props = {
  event: ForzaEvent;
  /** User's published result on this event (My Events / Profile history). */
  participantResult?: ParticipantEventResult;
};

const classColor: Record<string, string> = {
  D: 'text-slate-400',
  C: 'text-yellow-400/90',
  B: 'text-orange-400/90',
  A: 'text-red-400/90',
  S1: 'text-violet-400/90',
  S2: 'text-fuchsia-400/90',
  R: 'text-amber-400/90',
  X: 'text-rose-300/95',
};

const MAX_CARS_SHOWN = 4;

function CarList({cars, game}: {cars: EventAllowedCar[]; game: ForzaEvent['game']}) {
  const {t} = useTranslation();
  const shown = cars.slice(0, MAX_CARS_SHOWN);
  const extra = cars.length - shown.length;
  const labels = formatCarListDisplayNames(
    cars.map((c) => ({carId: c.carId, make: c.make, model: c.model, year: c.year})),
  );
  const g = normalizeEventGame(game);

  return (
    <div className="hidden min-[500px]:block w-[10.5rem] shrink-0 text-left">
      <ul className="flex flex-col divide-y divide-white/[0.05]">
        {shown.map((car) => {
          const maxClass = piToClass(car.maxPi, g);
          const carLabel = labels.get(car.carId) ?? car.model;

          return (
            <li
              key={car.carId}
              className="grid grid-cols-[minmax(0,1fr)_2.75rem] items-center gap-x-2.5 py-1 text-[10px] leading-tight first:pt-0 last:pb-0"
            >
              <span
                className="truncate font-medium text-slate-200"
                title={carLabel}
              >
                {carLabel}
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
      {extra > 0 ? (
        <p className="mt-1 text-[10px] leading-none text-muted">
          {t('eventCard.moreCars', {count: extra})}
        </p>
      ) : null}
    </div>
  );
}

function OpenBuildSummary({event}: {event: ForzaEvent}) {
  const display = formatOpenBuildCarRulesDisplay(event);
  if (!display) return null;
  const twoCol = Boolean(display.notes && display.piLabel);
  const piClass = display.piLabel
    ? piToClass(event.maxPi!, normalizeEventGame(event.game))
    : null;

  return (
    <div className="hidden min-[500px]:block w-[10.5rem] shrink-0 text-left">
      <ul className="flex flex-col gap-1">
        <li
          className={cn(
            'text-[10px] leading-tight',
            twoCol && 'grid grid-cols-[minmax(0,1fr)_2.75rem] items-center gap-x-2.5',
          )}
        >
          {display.notes ? (
            <span className="truncate font-medium text-slate-200" title={display.notes}>
              {display.notes}
            </span>
          ) : null}
          {display.piLabel && piClass ? (
            <span
              className={cn(
                'font-bold tabular-nums',
                twoCol && 'text-right',
                classColor[piClass] ?? 'text-muted',
              )}
            >
              {display.piLabel}
            </span>
          ) : null}
        </li>
      </ul>
    </div>
  );
}

export function EventCard({event, participantResult}: Props) {
  const {pathname} = useLocation();
  const {t} = useTranslation();
  const when = formatEventStart(event.startsAt);
  const draft = isDraftEvent(event);
  const displayStatus = useResolveEventDisplayStatus(event);
  const ended = !draft && displayStatus === 'ended';
  const live = !draft && displayStatus === 'live';
  const placement = participantResultLabel(participantResult, t);
  const {user} = useAuth();
  const isHost = event.hostDiscordId === user.discordId;
  const organiserLabel = resolveOrganiserLabel(event);
  const coverSrc = event.coverImageUrl ?? defaultCoverPath(event.type);
  const [coverReady, setCoverReady] = useState(false);
  const cardTo = draft && isHost ? `/create?edit=${event.id}` : `/event/${event.id}`;
  useEffect(() => {
    setCoverReady(false);
  }, [coverSrc, event.id]);

  const cardInner = (
        <div
          className={cn(
            'relative overflow-hidden rounded-xl border transition-all duration-200 min-h-[7.5rem]',
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
            fill
            imgClassName={cn(
              'transition-all duration-300 group-hover:scale-[1.02]',
              coverReady ? 'opacity-100' : 'opacity-0',
            )}
            onReady={() => setCoverReady(true)}
          />
          {!coverReady ? (
            <div
              className="absolute inset-0 animate-pulse bg-white/[0.04]"
              aria-hidden
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-r from-base/80 via-base/70 to-base/60" />
          <div className="absolute inset-0 bg-black/25 transition-colors duration-200 group-hover:bg-black/20" />

          <div className="relative flex flex-col gap-3 px-4 pt-3 pb-4 min-[500px]:flex-row min-[500px]:items-start min-[500px]:gap-4">
            <div className="min-w-0 flex-1 text-left">
              <h2
                className="text-lg font-semibold leading-snug text-white line-clamp-2 min-[500px]:line-clamp-none"
                title={event.title}
              >
                {event.title}
              </h2>
              <p className="mt-0.5 flex min-w-0 items-center gap-1.5 truncate text-xs text-slate-400">
                <GameBadge
                  game={normalizeEventGame(event.game)}
                  variant="short"
                  className="shrink-0"
                />
                <span className="min-w-0 truncate">{organiserLabel}</span>
                {isHost && (
                  <span className="shrink-0 text-[9px] font-bold uppercase tracking-widest text-accent-purple-light">
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
                  {formatLobbyCount(event.currentPlayers, totalCapacity(event))}
                  {event.isRanked && (
                    <span className="ml-1 text-[9px] font-bold uppercase tracking-widest text-amber-300/90">
                      · {t('eventStatus.ranked')}
                    </span>
                  )}
                  {ended && (
                    <span className="ml-1 text-[9px] font-bold uppercase tracking-widest text-muted">
                      · {t('eventStatus.ended')}
                    </span>
                  )}
                  {live && (
                    <span className="ml-1 text-[9px] font-bold uppercase tracking-widest text-accent-green">
                      · {t('eventStatus.live')}
                    </span>
                  )}
                  {placement && (
                    <span className="ml-1 text-[9px] font-bold uppercase tracking-widest text-amber-300">
                      · {placement}
                    </span>
                  )}
                </p>
              )}
            </div>

            {event.carRuleMode === 'restricted_list' && event.allowedCars.length > 0 && (
              <CarList cars={event.allowedCars} game={event.game} />
            )}
            {event.carRuleMode === 'anything_goes' && openBuildHasDisplayRules(event) && (
              <OpenBuildSummary event={event} />
            )}
          </div>

          <div
            className={cn(
              'absolute inset-x-0 bottom-0 h-[2px]',
              eventTypeMeta(event.type).accentBar,
            )}
          />
        </div>
  );

  return (
    <article className="group relative">
      <Link to={cardTo} state={{event, from: pathname}} className="block">
        {cardInner}
      </Link>
    </article>
  );
}
