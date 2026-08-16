import {useMemo} from 'react';
import {useTranslation} from 'react-i18next';
import {Calendar, Crown, Mic, User, Car, Shield, Wrench} from 'lucide-react';
import {formatDiscordHandle} from '../../../lib/discordHandle';
import {RoadIcon} from '../../../components/icons/RoadIcon';
import type {EventTrack, ForzaEvent} from '../../../lib/types';
import {formatCarDisplayName} from '../../../lib/carDisplay';
import {
  formatOpenBuildCarRulesDisplay,
  openBuildHasDisplayRules,
} from '../../../lib/carRules';
import {piClassColor, piToClass} from '../../../lib/pi';
import {normalizeEventGame} from '../../../lib/eventGames';
import {sectionLabelClass} from '../../../components/ui/formStyles';
import {resolveEventGroups} from '../../../lib/eventRoster';
import {openExternalUrl} from '../../../lib/discordInstall';
import {
  eventVoiceJoinUrl,
  voiceChannelMention,
} from '../../../lib/eventSpec';
import {TextButton} from '../../../components/ui/TextButton';
import {cn} from '../../../lib/cn';
import {handleShareCodeCopy, handleShareCodeDoubleClick} from '../../../lib/shareCode';

const carRuleRowClass =
  'grid grid-cols-[minmax(0,1fr)_3.5rem] items-center gap-x-3 text-sm leading-tight';

const rowClass = 'flex gap-3 py-2 first:pt-0';
const iconClass = 'mt-0.5 h-4 w-4 shrink-0 text-muted';
function ShareCodeText({value}: {value: string}) {
  return <span onMouseDown={handleShareCodeDoubleClick}>{value}</span>;
}

function TrackDisplayLine({
  track,
  fallbackName,
}: {
  track: EventTrack;
  fallbackName: string;
}) {
  const name = track.name.trim() || fallbackName;
  const code = track.shareCode?.trim();
  const format = track.format?.trim();
  const codeEl = code ? <ShareCodeText value={code} /> : null;
  if (name) {
    return (
      <>
        {name}
        {codeEl ? <> · {codeEl}</> : null}
        {format ? ` — ${format}` : null}
      </>
    );
  }
  if (codeEl) {
    return (
      <>
        {codeEl}
        {format ? ` — ${format}` : null}
      </>
    );
  }
  return format ?? '';
}

type Props = {
  event: ForzaEvent;
  when: string;
};

export function EventDetailInfoPanel({event, when}: Props) {
  const {t} = useTranslation();
  const game = normalizeEventGame(event.game);
  const openBuildDisplay = formatOpenBuildCarRulesDisplay(event);
  const showCarRulesRow =
    event.carRuleMode === 'restricted_list' || openBuildHasDisplayRules(event);
  const multiGroup = (event.groupCount ?? 1) > 1;
  const convoyLeaderGroups = useMemo(
    () =>
      resolveEventGroups(event, '')
        .filter((g) => g.leader?.gamertag)
        .map((g) => ({groupIndex: g.groupIndex, gamertag: g.leader!.gamertag})),
    [event],
  );
  const showConvoyLeaderList = convoyLeaderGroups.length > 1 || multiGroup;
  const joinVoiceUrl = eventVoiceJoinUrl(event);
  const voiceMention = voiceChannelMention(event.voiceChannelName);

  return (
    <div className="mt-5 divide-y divide-white/[0.05]" onCopy={handleShareCodeCopy}>
      <div className={rowClass}>
        <Calendar className={iconClass} />
        <div>
          <p className={sectionLabelClass}>{t('eventDetail.dateTime')}</p>
          <p className="mt-0.5 text-sm text-slate-200">{when}</p>
        </div>
      </div>

      {joinVoiceUrl ? (
        <div className={rowClass}>
          <Mic className={iconClass} />
          <div className="min-w-0">
            <p className={sectionLabelClass}>{t('eventDetail.voice')}</p>
            <TextButton
              tone="action"
              className={cn(
                'mt-0.5 inline-flex max-w-full items-baseline rounded-sm !text-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple/50',
                voiceMention &&
                  'underline decoration-accent-purple/40 underline-offset-[3px] hover:decoration-accent-purple',
              )}
              title={voiceMention ?? undefined}
              aria-label={
                event.voiceChannelName?.trim()
                  ? t('eventDetail.joinVoiceNamed', {name: event.voiceChannelName.trim()})
                  : t('eventDetail.joinVoice')
              }
              onClick={() => void openExternalUrl(joinVoiceUrl)}
            >
              {voiceMention ? (
                <span className="min-w-0 truncate">
                  <span className="font-normal text-muted" aria-hidden>#</span>
                  {voiceMention.slice(1)}
                </span>
              ) : (
                t('eventDetail.joinVoice')
              )}
            </TextButton>
          </div>
        </div>
      ) : null}

      <div className={rowClass}>
        <User className={iconClass} />
        <div>
          <p className={sectionLabelClass}>{t('eventDetail.host')}</p>
          <p className="mt-0.5 text-sm font-medium text-slate-200">
            {formatDiscordHandle(event.hostUsername)}
          </p>
        </div>
      </div>

      {convoyLeaderGroups.length > 0 ? (
        <div className={rowClass}>
          <Crown className={iconClass} />
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
              <p className="mt-1 text-sm text-slate-200">
                <TrackDisplayLine
                  track={event.tracks![0]}
                  fallbackName={t('create.trackFallback', {n: 1})}
                />
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
                    <span>
                      <TrackDisplayLine
                        track={track}
                        fallbackName={t('create.trackFallback', {n: i + 1})}
                      />
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      ) : null}

      {showCarRulesRow ? (
      <div className={rowClass}>
        <Car className={iconClass} />
        <div className="min-w-0 flex-1">
          <p className={sectionLabelClass}>{t('eventDetail.carRules')}</p>
          {event.carRuleMode === 'anything_goes' && openBuildDisplay ? (
            <ul className="mt-1.5 flex flex-col gap-1">
              <li
                className={cn(
                  carRuleRowClass,
                  !(openBuildDisplay.notes && openBuildDisplay.piLabel) && 'grid-cols-1',
                )}
              >
                {openBuildDisplay.notes ? (
                  <span className="truncate font-medium text-slate-200">
                    {openBuildDisplay.notes}
                  </span>
                ) : null}
                {openBuildDisplay.piLabel ? (
                  <span
                    className={cn(
                      'text-right font-bold tabular-nums',
                      piClassColor[piToClass(event.maxPi!, game)] ?? 'text-muted',
                    )}
                  >
                    {openBuildDisplay.piLabel}
                  </span>
                ) : null}
              </li>
            </ul>
          ) : event.allowedCars.length === 0 ? (
            <p className="mt-1 text-sm text-muted">{t('eventDetail.restrictedSoon')}</p>
          ) : (
            <ul className="mt-1.5 space-y-2">
              {event.allowedCars.map((c) => {
                const maxClass = piToClass(c.maxPi, game);
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
                            <ShareCodeText value={c.tuneShareCode} />
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
      ) : null}
    </div>
  );
}
