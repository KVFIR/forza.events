import {useMemo} from 'react';
import {useTranslation} from 'react-i18next';
import {Calendar, User, Users, Car, Shield, Wrench} from 'lucide-react';
import {formatDiscordHandle} from '../../../lib/discordHandle';
import {RoadIcon} from '../../../components/icons/RoadIcon';
import {formatTrackDisplayLine} from '../../../lib/eventTracks';
import {formatCarDisplayName} from '../../../lib/carDisplay';
import {piClassColor, piToClass} from '../../../lib/pi';
import {sectionLabelClass} from '../../../components/ui/formStyles';
import {resolveEventGroups} from '../../../lib/eventRoster';
import type {ForzaEvent} from '../../../lib/types';
import {cn} from '../../../lib/cn';

const carRuleRowClass =
  'grid grid-cols-[minmax(0,1fr)_3.5rem] items-center gap-x-3 text-sm leading-tight';

const rowClass = 'flex gap-3 py-2 first:pt-0';
const iconClass = 'mt-0.5 h-4 w-4 shrink-0 text-muted';

type Props = {
  event: ForzaEvent;
  when: string;
};

export function EventDetailInfoPanel({event, when}: Props) {
  const {t} = useTranslation();
  const multiGroup = (event.groupCount ?? 1) > 1;
  const convoyLeaderGroups = useMemo(
    () =>
      resolveEventGroups(event, '')
        .filter((g) => g.leader?.gamertag)
        .map((g) => ({groupIndex: g.groupIndex, gamertag: g.leader!.gamertag})),
    [event],
  );
  const showConvoyLeaderList = convoyLeaderGroups.length > 1 || multiGroup;

  return (
    <div className="mt-5 divide-y divide-white/[0.05]">
      <div className={rowClass}>
        <Calendar className={cn(iconClass, 'text-accent-purple-light/80')} />
        <div>
          <p className={sectionLabelClass}>{t('eventDetail.dateTime')}</p>
          <p className="mt-0.5 text-sm text-slate-200">{when}</p>
        </div>
      </div>

      <div className={rowClass}>
        <User className={cn(iconClass, 'text-accent-purple-light/80')} />
        <div>
          <p className={sectionLabelClass}>{t('eventDetail.host')}</p>
          <p className="mt-0.5 text-sm font-medium text-slate-200">
            {formatDiscordHandle(event.hostUsername)}
          </p>
        </div>
      </div>

      {convoyLeaderGroups.length > 0 ? (
        <div className={rowClass}>
          <Users className={cn(iconClass, 'text-accent-green/80')} />
          <div className="min-w-0">
            <p className={sectionLabelClass}>
              {showConvoyLeaderList
                ? t('eventDetail.convoyLeaders')
                : t('eventDetail.convoyLeader')}
            </p>
            {showConvoyLeaderList ? (
              <ul className="mt-1 space-y-0.5">
                {convoyLeaderGroups.map(({groupIndex, gamertag}) => (
                  <li
                    key={groupIndex}
                    className="flex items-baseline gap-2 text-sm text-slate-200"
                  >
                    <span className="shrink-0 text-xs font-medium text-muted">
                      {t('eventDetail.group', {n: groupIndex})}
                    </span>
                    <span className="font-medium">{gamertag}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-0.5 text-sm font-medium text-slate-200">
                {convoyLeaderGroups[0].gamertag}
              </p>
            )}
          </div>
        </div>
      ) : null}

      {(event.tracks?.length ?? 0) > 0 ? (
        <div className={rowClass}>
          <RoadIcon className={iconClass} />
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
                    <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center text-[10px] font-bold tabular-nums text-muted">
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

      <div className={rowClass}>
        <Car className={iconClass} />
        <div className="min-w-0 flex-1">
          <p className={sectionLabelClass}>{t('eventDetail.carRules')}</p>
          {event.carRuleMode === 'anything_goes' ? (
            <ul className="mt-1.5 flex flex-col gap-1">
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
            <ul className="mt-1.5 space-y-2">
              {event.allowedCars.map((c) => {
                const maxClass = piToClass(c.maxPi);
                return (
                  <li key={c.carId}>
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
    </div>
  );
}
