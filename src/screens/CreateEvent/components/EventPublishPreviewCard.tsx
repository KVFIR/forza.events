import {useEffect, useState} from 'react';
import {Calendar, MapPin, Users} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {Badge, CarRuleBadge} from '../../../components/ui/Badge';
import {EventCover} from '../../../components/EventCover';
import {defaultCoverPath} from '../../../lib/eventCovers';
import {formatCarDisplayName} from '../../../lib/carDisplay';
import {cn} from '../../../lib/cn';
import {defaultTimezone, formatEventTime, localInputToUtc} from '../../../lib/datetime';
import {eventTypeMeta, isEventType} from '../../../lib/eventTypes';
import {clampPi, piToClass} from '../../../lib/pi';
import type {EventCarEntry} from '../../../components/EventCarList';
import type {CreateEventType} from '../types';
import {formatTrackDisplayLine} from '../../../lib/eventTracks';
import type {CarRuleMode, EventTrack} from '../../../lib/types';

const MAX_CARS_SHOWN = 3;
const MAX_TRACKS_SHOWN = 3;

const classColor: Record<string, string> = {
  D: 'text-slate-400',
  C: 'text-yellow-400/90',
  B: 'text-orange-400/90',
  A: 'text-red-400/90',
  S1: 'text-violet-400/90',
  S2: 'text-fuchsia-400/90',
  R: 'text-amber-400/90',
};

type Props = {
  title: string;
  type: CreateEventType;
  description: string;
  coverPreview: string | null;
  startsAtLocal: string;
  carRuleMode: CarRuleMode;
  maxPi: number;
  additionalCarRestrictions: string;
  eventCars: EventCarEntry[];
  tracks: EventTrack[];
  lobbyLeaderLabel: string;
};

export function EventPublishPreviewCard({
  title,
  type,
  description,
  coverPreview,
  startsAtLocal,
  carRuleMode,
  maxPi,
  additionalCarRestrictions,
  eventCars,
  tracks,
  lobbyLeaderLabel,
}: Props) {
  const {t} = useTranslation();
  const [coverReady, setCoverReady] = useState(false);
  const displayTitle = title.trim() || t('create.untitled');
  const trimmedDescription = description.trim();
  const when =
    startsAtLocal
      ? formatEventTime(localInputToUtc(startsAtLocal, defaultTimezone()), defaultTimezone())
      : null;
  const coverSrc =
    coverPreview ??
    (isEventType(type) ? defaultCoverPath(type) : defaultCoverPath('road'));
  const typeMeta = isEventType(type) ? eventTypeMeta(type) : null;
  const openBuildLabel = additionalCarRestrictions.trim() || t('common.openBuild');
  const maxClass = piToClass(maxPi);
  const shownCars = eventCars.slice(0, MAX_CARS_SHOWN);
  const extraCars = eventCars.length - shownCars.length;
  const shownTracks = tracks.slice(0, MAX_TRACKS_SHOWN);
  const extraTracks = tracks.length - shownTracks.length;

  useEffect(() => {
    setCoverReady(false);
  }, [coverSrc]);

  return (
    <article
      className="relative overflow-hidden rounded-xl border border-white/[0.08]"
      aria-label={t('create.publishPreview')}
    >
      <div className="relative min-h-[8.5rem] overflow-hidden">
        <EventCover
          src={coverSrc}
          variant="card"
          fill
          imgClassName={cn(
            'transition-opacity duration-300',
            coverReady ? 'opacity-100' : 'opacity-0',
          )}
          onReady={() => setCoverReady(true)}
        />
        {!coverReady ? (
          <div className="absolute inset-0 animate-pulse bg-white/[0.04]" aria-hidden />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-base/85 via-base/75 to-base/55" />
        <div className="absolute inset-0 bg-black/20" />

        <div className="relative flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-end sm:gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {typeMeta ? <Badge type={typeMeta.value} /> : null}
              <CarRuleBadge mode={carRuleMode} />
            </div>
            <h2 className="text-lg font-semibold leading-tight text-white">{displayTitle}</h2>
            {when ? (
              <p className="flex items-center gap-1.5 text-xs text-slate-300">
                <Calendar className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
                {when.primary}
              </p>
            ) : null}
            {trimmedDescription ? (
              <p className="line-clamp-2 text-xs leading-relaxed text-slate-400">
                {trimmedDescription}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
                <span className="text-muted">{t('create.leader')}:</span>
                {lobbyLeaderLabel}
              </span>
              {tracks.length > 0 ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
                  <span className="text-muted">{t('eventDetail.tracks')}:</span>
                  {t('create.trackCount', {count: tracks.length})}
                </span>
              ) : null}
            </div>
          </div>

          {carRuleMode === 'restricted_list' && shownCars.length > 0 ? (
            <ul className="shrink-0 space-y-1 border-t border-white/[0.06] pt-2 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4 sm:max-w-[11rem]">
              {shownCars.map((car) => {
                const carClass = piToClass(car.maxPi);
                return (
                  <li
                    key={car.id}
                    className="grid grid-cols-[minmax(0,1fr)_2.75rem] items-center gap-x-2 text-[10px] leading-tight"
                  >
                    <span className="truncate font-medium text-slate-200">
                      {formatCarDisplayName(car)}
                    </span>
                    <span
                      className={cn(
                        'text-right font-bold tabular-nums',
                        classColor[carClass] ?? 'text-muted',
                      )}
                    >
                      {carClass} {car.maxPi}
                    </span>
                  </li>
                );
              })}
              {extraCars > 0 ? (
                <li className="text-[10px] text-muted">+{extraCars}</li>
              ) : null}
            </ul>
          ) : null}

          {carRuleMode === 'anything_goes' ? (
            <div className="shrink-0 border-t border-white/[0.06] pt-2 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4">
              <p className="grid grid-cols-[minmax(0,1fr)_2.75rem] items-center gap-x-2 text-[10px] leading-tight">
                <span className="truncate font-medium text-slate-200">{openBuildLabel}</span>
                <span
                  className={cn(
                    'text-right font-bold tabular-nums',
                    classColor[maxClass] ?? 'text-muted',
                  )}
                >
                  {maxClass} {clampPi(maxPi)}
                </span>
              </p>
            </div>
          ) : null}
        </div>

        {typeMeta ? (
          <div className={cn('absolute inset-x-0 bottom-0 h-[2px]', typeMeta.accentBar)} />
        ) : null}
      </div>

      {shownTracks.length > 0 ? (
        <ol className="border-t border-white/[0.06] px-4 py-2.5">
          {shownTracks.map((track, i) => (
            <li
              key={`${track.name}-${track.shareCode ?? ''}-${i}`}
              className="flex items-start gap-2 text-[11px] leading-snug text-slate-300"
            >
              <span className="w-4 shrink-0 text-right text-[10px] font-bold tabular-nums text-muted">
                {i + 1}.
              </span>
              <span className={track.shareCode && !track.name ? 'font-mono tracking-wide' : ''}>
                {formatTrackDisplayLine(track, t('create.trackFallback', {n: i + 1}))}
              </span>
            </li>
          ))}
          {extraTracks > 0 ? (
            <li className="mt-1 text-[10px] text-muted">
              {t('create.previewMoreTracks', {count: extraTracks})}
            </li>
          ) : null}
        </ol>
      ) : null}
    </article>
  );
}
