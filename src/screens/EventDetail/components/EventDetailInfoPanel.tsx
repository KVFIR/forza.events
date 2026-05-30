import {useTranslation} from 'react-i18next';
import {Calendar, Users, Car, Shield, Wrench} from 'lucide-react';
import {RoadIcon} from '../../../components/icons/RoadIcon';
import {formatTrackDisplayLine} from '../../../lib/eventTracks';
import {formatCarDisplayName} from '../../../lib/carDisplay';
import {piClassColor, piToClass} from '../../../lib/pi';
import {iconTileClass, sectionLabelClass} from '../../../components/ui/formStyles';
import {Panel} from '../../../components/ui/Panel';
import type {ForzaEvent} from '../../../lib/types';
import {cn} from '../../../lib/cn';

const carRuleRowClass =
  'grid grid-cols-[minmax(0,1fr)_3.5rem] items-center gap-x-3 text-sm leading-tight';

type Props = {
  event: ForzaEvent;
  when: string;
};

export function EventDetailInfoPanel({event, when}: Props) {
  const {t} = useTranslation();

  return (
    <Panel divided className="mt-5 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className={iconTileClass}>
          <Calendar className="h-3.5 w-3.5 text-accent-purple-light" />
        </div>
        <div>
          <p className={sectionLabelClass}>{t('eventDetail.dateTime')}</p>
          <p className="mt-0.5 text-sm text-slate-200">{when}</p>
        </div>
      </div>

      {event.lobbyLeaderGamertag ? (
        <div className="flex items-center gap-3 px-4 py-3">
          <div className={iconTileClass}>
            <Users className="h-3.5 w-3.5 text-accent-green" />
          </div>
          <div>
            <p className={sectionLabelClass}>{t('eventDetail.convoyLeader')}</p>
            <p className="mt-0.5 text-sm font-medium text-slate-200">{event.lobbyLeaderGamertag}</p>
          </div>
        </div>
      ) : null}

      {(event.tracks?.length ?? 0) > 0 ? (
        <div className="flex items-start gap-3 px-4 py-3">
          <div className={iconTileClass}>
            <RoadIcon className="text-muted-light" />
          </div>
          <div className="min-w-0">
            <p className={sectionLabelClass}>{t('eventDetail.tracks')}</p>
            {event.tracks!.length === 1 ? (
              <p
                className={cn(
                  'mt-1 text-sm text-slate-200',
                  event.tracks![0].shareCode && !event.tracks![0].name
                    ? 'font-mono tracking-wide'
                    : '',
                )}
              >
                {formatTrackDisplayLine(
                  event.tracks![0],
                  t('create.trackFallback', {n: 1}),
                )}
              </p>
            ) : (
              <ol className="mt-1 space-y-0.5">
                {event.tracks!.map((track, i) => (
                  <li
                    key={`${track.name}-${track.shareCode ?? ''}-${i}`}
                    className="flex items-start gap-2 text-sm text-slate-200"
                  >
                    <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] px-1.5 text-[10px] font-bold text-muted">
                      {i + 1}
                    </span>
                    <span
                      className={
                        track.shareCode && !track.name ? 'font-mono tracking-wide' : ''
                      }
                    >
                      {formatTrackDisplayLine(track, t('create.trackFallback', {n: i + 1}))}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      ) : null}

      <div className="flex items-start gap-3 px-4 py-3">
        <div className={iconTileClass}>
          <Car className="h-3.5 w-3.5 text-muted-light" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={sectionLabelClass}>{t('eventDetail.carRules')}</p>
          {event.carRuleMode === 'anything_goes' ? (
            <ul className="mt-2 flex flex-col gap-1">
              <li className={carRuleRowClass}>
                <span className="truncate font-medium text-slate-200">
                  {event.additionalCarRestrictions?.trim() || t('common.openBuild')}
                </span>
                <span
                  className={cn(
                    'text-right font-bold tabular-nums',
                    piClassColor[piToClass(event.maxPi)] ?? 'text-muted',
                  )}
                >
                  {piToClass(event.maxPi)} {event.maxPi}
                </span>
              </li>
            </ul>
          ) : event.allowedCars.length === 0 ? (
            <p className="mt-1 text-sm text-muted">{t('eventDetail.restrictedSoon')}</p>
          ) : (
            <ul className="mt-2 divide-y divide-white/[0.05]">
              {event.allowedCars.map((c) => {
                const maxClass = piToClass(c.maxPi);
                return (
                  <li key={c.carId} className="py-2.5 first:pt-0 last:pb-0">
                    <div className={carRuleRowClass}>
                      <span className="truncate font-medium text-slate-200">
                        {formatCarDisplayName(c)}
                        {c.year ? (
                          <span className="ml-1 text-xs font-normal text-muted">{c.year}</span>
                        ) : null}
                      </span>
                      <span
                        className={cn(
                          'text-right font-bold tabular-nums',
                          piClassColor[maxClass] ?? 'text-muted',
                        )}
                      >
                        {maxClass} {c.maxPi}
                      </span>
                    </div>
                    {(c.tuneShareCode || c.restrictions.length > 0) && (
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                        {c.tuneShareCode ? (
                          <span className="flex items-center gap-1">
                            <Wrench className="h-3 w-3 shrink-0" />
                            {c.tuneShareCode}
                          </span>
                        ) : null}
                        {c.restrictions.map((r) => (
                          <span key={r} className="flex items-center gap-1">
                            <Shield className="h-3 w-3 shrink-0" />
                            {r}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Panel>
  );
}
