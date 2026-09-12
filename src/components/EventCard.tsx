import {useEffect, useState, type ReactNode} from 'react';
import {useTranslation} from 'react-i18next';
import {Link, useLocation} from 'react-router-dom';
import {Star, Users} from 'lucide-react';
import type {ParticipantEventResult} from '../lib/participantResults';
import {participantResultLabel} from '../lib/participantResultsLabel';
import type {ForzaEvent} from '../lib/types';
import {eventTypeMeta} from '../lib/eventTypes';
import {cn} from '../lib/cn';
import {isDraftEvent} from '../lib/eventList';
import {formatLobbyCount} from '../lib/constants';
import {totalCapacity} from '../lib/eventSpec';
import {resolveOrganiserLabel} from '../lib/organiser';
import {formatEventStart, formatEventStartsIn} from '../lib/datetime';
import {eventDetailPath} from '@edge/eventPath.ts';
import {defaultCoverPath} from '../lib/eventCovers';
import {formatCarEmbedName, formatCarListDisplayNames} from '../lib/carDisplay';
import {formatOpenBuildCarRulesDisplay, openBuildHasDisplayRules} from '../lib/carRules';
import {
  formatMaxPi,
  formatPiRange,
  piClassBorderColor,
  piClassColor,
  piToClass,
  restrictedCarsPiBounds,
} from '../lib/pi';
import {normalizeEventGame} from '../lib/eventGames';
import {useAuth} from '../context/AuthContext';
import {useResolveEventDisplayStatus} from '../hooks/useResolveEventDisplayStatus';
import {EventCover} from './EventCover';

type CardDensity = 'cover' | 'compact';

type Props = {
  event: ForzaEvent;
  /** User's published result on this event (My Events / Profile history). */
  participantResult?: ParticipantEventResult;
  /** Browse = taller cover-led overlay. Lists stay compact. */
  density?: CardDensity;
};

/** Caption gradient — base-color alpha stops, not `transparent` (same as event-detail-hero-fade). */
const COVER_FADE_STYLE = {
  background:
    'linear-gradient(to top, rgb(6 6 14) 0%, rgb(6 6 14 / 0.92) 22%, rgb(6 6 14 / 0.55) 55%, rgb(6 6 14 / 0) 100%)',
} as const;

function ColoredPi({
  pi,
  game,
  children,
}: {
  pi: number;
  game: ForzaEvent['game'];
  children?: ReactNode;
}) {
  const letter = piToClass(pi, game);
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-1.5 py-px font-bold tabular-nums',
        piClassColor[letter] ?? 'text-muted',
        piClassBorderColor[letter] ?? 'border-white/20',
      )}
    >
      {children ?? formatMaxPi(pi, game)}
    </span>
  );
}

function ColoredPiRange({
  minPi,
  maxPi,
  game,
}: {
  minPi: number;
  maxPi: number;
  game: ForzaEvent['game'];
}) {
  if (minPi === maxPi) return <ColoredPi pi={maxPi} game={game} />;
  if (piToClass(minPi, game) === piToClass(maxPi, game)) {
    return (
      <ColoredPi pi={maxPi} game={game}>
        {formatPiRange(minPi, maxPi, game)}
      </ColoredPi>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <ColoredPi pi={minPi} game={game} />
      <span className="text-slate-500">–</span>
      <ColoredPi pi={maxPi} game={game} />
    </span>
  );
}

function CoverCarLine({event}: {event: ForzaEvent}) {
  const {t} = useTranslation();
  const game = normalizeEventGame(event.game);

  if (event.carRuleMode === 'restricted_list' && event.allowedCars.length > 0) {
    const cars = event.allowedCars;
    const span = restrictedCarsPiBounds(cars);
    if (!span) return null;
    const labels = formatCarListDisplayNames(cars);
    const names = cars.map((c) => labels.get(c.id) ?? formatCarEmbedName(c));
    const visibleNames = names.slice(0, 5);
    const extra = names.length - visibleNames.length;
    const pi =
      cars.length === 1 ? (
        <ColoredPi pi={cars[0]!.maxPi} game={game} />
      ) : (
        <ColoredPiRange minPi={span.minPi} maxPi={span.maxPi} game={game} />
      );
    const title = `${names.join(' · ')} · ${formatPiRange(span.minPi, span.maxPi, game)}`;
    return (
      <div
        className="hidden min-w-0 max-w-[10.5rem] shrink-0 text-right min-[500px]:block"
        title={title}
      >
        <div className="flex flex-col items-end gap-px text-xs leading-tight text-slate-400">
          {visibleNames.map((name, i) => (
            <span key={cars[i]!.id} className="max-w-full truncate text-right">
              {name}
            </span>
          ))}
          {extra > 0 ? <span className="text-right">+{extra}</span> : null}
          <span className="mt-1 shrink-0 text-right">{pi}</span>
        </div>
      </div>
    );
  }

  if (!openBuildHasDisplayRules(event)) return null;
  const display = formatOpenBuildCarRulesDisplay(event);
  if (!display) return null;
  const label = display.notes?.trim() || t('common.openBuild');
  const pi = event.maxPi != null ? <ColoredPi pi={event.maxPi} game={game} /> : null;
  const title = [label, display.piLabel].filter(Boolean).join(' · ');

  return (
    <div
      className="hidden min-w-0 max-w-[10.5rem] shrink-0 text-right min-[500px]:block"
      title={title}
    >
      <div className="flex min-w-0 items-baseline justify-end gap-x-2 text-xs leading-tight">
        <span className="min-w-0 truncate text-right font-medium text-slate-200">{label}</span>
        {pi ? <span className="shrink-0 text-right">{pi}</span> : null}
      </div>
    </div>
  );
}

export function EventCard({event, participantResult, density = 'compact'}: Props) {
  const {pathname} = useLocation();
  const {t} = useTranslation();
  const when = formatEventStart(event.startsAt);
  const startsIn = formatEventStartsIn(event.startsAt);
  const draft = isDraftEvent(event);
  const displayStatus = useResolveEventDisplayStatus(event);
  const ended = !draft && displayStatus === 'ended';
  const cancelled = event.lifecycle === 'cancelled';
  const live = !draft && displayStatus === 'live';
  const upcoming = !draft && !live && !ended && !cancelled && Boolean(startsIn);
  const dimmed = ended || cancelled;
  const coverLed = density === 'cover';
  const placement = participantResultLabel(participantResult, t);
  const {user} = useAuth();
  const isHost = event.hostDiscordId === user.discordId;
  const organiserLabel = resolveOrganiserLabel(event);
  const coverSrc = event.coverImageUrl ?? defaultCoverPath(event.type);
  const [coverReady, setCoverReady] = useState(false);
  const cardTo = draft && isHost ? `/create?edit=${event.id}` : eventDetailPath(event);
  useEffect(() => {
    setCoverReady(false);
  }, [coverSrc, event.id]);

  const cardInner = (
    <div
      className={cn(
        'relative flex flex-col justify-end overflow-hidden rounded-xl transition-all duration-200',
        coverLed ? 'min-h-[13.5rem]' : 'min-h-[8.25rem]',
        draft
          ? 'border border-dashed border-sky-500/35'
          : 'border border-white/[0.08]',
        dimmed && 'opacity-40 group-hover:opacity-55',
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
        <div className="absolute inset-0 animate-pulse bg-white/[0.04]" aria-hidden />
      ) : null}
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0',
          coverLed ? 'h-[58%]' : 'h-[72%]',
        )}
        style={COVER_FADE_STYLE}
        aria-hidden
      />
      <div className="relative z-[1] flex min-w-0 items-end gap-3 px-4 pb-3 pt-4">
        <div className="min-w-0 flex-1 text-left">
          <h2
            className="line-clamp-2 text-lg font-semibold leading-snug text-white"
            title={event.title}
          >
            {event.isRanked ? (
              <Star
                className="mr-1.5 inline h-[0.95em] w-[0.95em] -translate-y-px text-amber-400"
                aria-hidden
              />
            ) : null}
            {event.isRanked ? (
              <span className="sr-only">{t('eventStatus.ranked')} </span>
            ) : null}
            {event.title}
          </h2>
          <p className="mt-0.5 truncate text-xs text-slate-400">{organiserLabel}</p>
          <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
            {draft ? <span>{t('eventStatus.draft')}</span> : null}
            {cancelled ? <span>{t('eventStatus.cancelled')}</span> : null}
            {ended && !cancelled ? <span>{t('eventStatus.ended')}</span> : null}
            {live ? (
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-green" aria-hidden />
                {t('eventStatus.live')}
              </span>
            ) : null}
            {upcoming && startsIn ? <span>{startsIn}</span> : null}
            <span className="truncate">{when}</span>
            {!draft ? (
              <span className="inline-flex shrink-0 items-center gap-1">
                <Users className="h-3 w-3 shrink-0" />
                {formatLobbyCount(event.currentPlayers, totalCapacity(event))}
              </span>
            ) : null}
          </p>
        </div>
        {placement || coverLed ? (
          <div className="flex shrink-0 flex-col items-end justify-end gap-1">
            {placement ? (
              <p className="flex items-center justify-end gap-1.5 leading-none">
                {event.isRanked && participantResult?.ratingDelta != null ? (
                  <span
                    className={cn(
                      'text-xs font-bold tabular-nums',
                      participantResult.ratingDelta > 0
                        ? 'text-accent-green'
                        : participantResult.ratingDelta < 0
                          ? 'text-red-300'
                          : 'text-muted',
                    )}
                  >
                    {participantResult.ratingDelta > 0
                      ? `+${participantResult.ratingDelta}`
                      : String(participantResult.ratingDelta)}
                  </span>
                ) : null}
                <span className="text-sm font-bold tabular-nums text-white">
                  {placement}
                </span>
              </p>
            ) : null}
            {coverLed ? <CoverCarLine event={event} /> : null}
          </div>
        ) : null}
      </div>
      <div
        className={cn('absolute inset-x-0 bottom-0 h-0.5', eventTypeMeta(event.type).accentBar)}
      />
    </div>
  );

  return (
    <article className="group relative">
      <Link
        to={cardTo}
        state={{event, from: pathname}}
        className="block rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-purple-light"
      >
        {cardInner}
      </Link>
    </article>
  );
}
