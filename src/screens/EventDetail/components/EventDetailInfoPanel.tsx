import {useEffect, useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Calendar, Crown, Mic, Shield, Wrench, Volume2} from 'lucide-react';
import {RoadIcon} from '../../../components/icons/RoadIcon';
import type {EventTrack, ForzaEvent} from '../../../lib/types';
import {formatCarFullName} from '../../../lib/carDisplay';
import {carThumbUrl, handleCarThumbError} from '../../../lib/carThumb';
import {
  formatOpenBuildCarRulesDisplay,
  openBuildHasDisplayRules,
} from '../../../lib/carRules';
import {piClassColor, piToClass} from '../../../lib/pi';
import {normalizeEventGame} from '../../../lib/eventGames';
import {resolveEventGroups} from '../../../lib/eventRoster';
import {openExternalUrl} from '../../../lib/discordInstall';
import {
  eventVoiceJoinUrl,
  isEventFinalized,
  voiceChannelMention,
} from '../../../lib/eventSpec';
import {formatEventStartsIn} from '../../../lib/datetime';
import {TextButton} from '../../../components/ui/TextButton';
import {cn} from '../../../lib/cn';
import {dismissHint, isHintDismissed} from '../../../lib/hintDismiss';
import {handleShareCodeCopy, handleShareCodeDoubleClick} from '../../../lib/shareCode';

const carRuleRowClass =
  'grid grid-cols-[minmax(0,1fr)_3.5rem] items-center gap-x-3 text-sm leading-tight';

const rowClass = 'flex gap-3 py-2 first:pt-0';
const iconClass = 'mt-0.5 h-4 w-4 shrink-0 text-muted';
const mentionIconClass = 'h-3 w-3 shrink-0';
const discordTextLinkClass = cn(
  'mt-0.5 inline-flex max-w-full items-center rounded-sm !text-sm font-medium',
  '!text-slate-200 hover:!text-white',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-purple/50',
);
const discordTextLinkUnderlineClass =
  'inline-flex min-w-0 items-center gap-0.5 border-b border-white/40 hover:border-white/70';
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
  showJoinXboxHint?: boolean;
  joinXboxLeader?: string | null;
  showConvoyLeaderXboxHint?: boolean;
};

export function EventDetailInfoPanel({
  event,
  when,
  showJoinXboxHint = false,
  joinXboxLeader,
  showConvoyLeaderXboxHint = false,
}: Props) {
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
  const startsIn = isEventFinalized(event) ? null : formatEventStartsIn(event.startsAt);
  const xboxHintId = showConvoyLeaderXboxHint
    ? 'xbox-leader'
    : showJoinXboxHint
      ? `xbox-join:${event.id}`
      : null;
  const [xboxDismissed, setXboxDismissed] = useState(() =>
    xboxHintId ? isHintDismissed(xboxHintId) : false,
  );
  useEffect(() => {
    setXboxDismissed(xboxHintId ? isHintDismissed(xboxHintId) : false);
  }, [xboxHintId]);
  const showXboxHint = Boolean(xboxHintId) && !xboxDismissed;
  const leaderXboxSteps = t('participation.convoyLeaderXboxHintSteps', {returnObjects: true});

  return (
    <div className="mt-5 divide-y divide-white/[0.05]" onCopy={handleShareCodeCopy}>
      <div className={rowClass}>
        <Calendar className={iconClass} />
        <div className="min-w-0">
          <p className="sr-only">{t('eventDetail.dateTime')}</p>
          <p className="mt-0.5 text-sm text-slate-200">{when}</p>
          {startsIn ? <p className="mt-0.5 text-xs text-muted">{startsIn}</p> : null}
        </div>
      </div>

      {joinVoiceUrl ? (
        <div className={rowClass}>
          <Mic className={iconClass} />
          <div className="min-w-0">
            <p className="sr-only">{t('eventDetail.voice')}</p>
            <TextButton
              tone="action"
              className={discordTextLinkClass}
              title={voiceMention ?? undefined}
              aria-label={
                event.voiceChannelName?.trim()
                  ? t('eventDetail.joinVoiceNamed', {name: event.voiceChannelName.trim()})
                  : t('eventDetail.joinVoice')
              }
              onClick={() => void openExternalUrl(joinVoiceUrl)}
            >
              {voiceMention ? (
                <span className={discordTextLinkUnderlineClass}>
                  <Volume2 className={mentionIconClass} aria-hidden />
                  <span className="min-w-0 truncate">{voiceMention.slice(1)}</span>
                </span>
              ) : (
                <span className={discordTextLinkUnderlineClass}>{t('eventDetail.joinVoice')}</span>
              )}
            </TextButton>
          </div>
        </div>
      ) : null}

      {convoyLeaderGroups.length > 0 || showXboxHint ? (
        <div className={rowClass}>
          <Crown className={iconClass} />
          <div className="min-w-0">
            <p className="sr-only">
              {showConvoyLeaderList
                ? t('eventDetail.convoyLeaders')
                : t('eventDetail.convoyLeader')}
            </p>
            {showConvoyLeaderList ? (
              <ul className="space-y-0.5">
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
            ) : convoyLeaderGroups[0] ? (
              <p className="mt-0.5 text-sm font-medium text-slate-200">
                {convoyLeaderGroups[0].gamertag}
              </p>
            ) : null}
            {showXboxHint ? (
              <div className="mt-2">
                {showConvoyLeaderXboxHint && Array.isArray(leaderXboxSteps) ? (
                  <ol className="list-decimal space-y-0.5 pl-4 text-xs leading-snug text-muted">
                    {leaderXboxSteps.map((step) => (
                      <li key={String(step)}>{String(step)}</li>
                    ))}
                  </ol>
                ) : showJoinXboxHint && joinXboxLeader ? (
                  <p className="text-xs leading-snug text-muted">
                    {t('participation.xboxHintBody', {leader: joinXboxLeader})}
                  </p>
                ) : null}
                <TextButton
                  tone="subtle"
                  className="mt-1"
                  onClick={() => {
                    if (!xboxHintId) return;
                    dismissHint(xboxHintId);
                    setXboxDismissed(true);
                  }}
                >
                  {t('common.dismiss')}
                </TextButton>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {(event.tracks?.length ?? 0) > 0 ? (
        <div className={rowClass}>
          <RoadIcon className={iconClass} />
          <div className="min-w-0">
            <p className="sr-only">{t('eventDetail.tracks')}</p>
            {event.tracks!.length === 1 ? (
              <p className="text-sm text-slate-200">
                <TrackDisplayLine
                  track={event.tracks![0]}
                  fallbackName={t('create.trackFallback', {n: 1})}
                />
              </p>
            ) : (
              <ol className="space-y-0.5">
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
        <div className="min-w-0 flex-1">
          <p className="sr-only">{t('eventDetail.carRules')}</p>
          {event.carRuleMode === 'anything_goes' && openBuildDisplay ? (
            <ul className="flex flex-col gap-1">
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
            <p className="text-sm text-muted">{t('eventDetail.restrictedSoon')}</p>
          ) : (
            <ul className="space-y-2">
              {event.allowedCars.map((c) => {
                const maxClass = piToClass(c.maxPi, game);
                const name = formatCarFullName(c);
                return (
                  <li key={c.carId} className="flex items-start gap-2.5">
                    <span className="h-10 w-[4.5rem] shrink-0 overflow-hidden">
                      <img
                        src={carThumbUrl(c, game)}
                        alt=""
                        width={160}
                        height={90}
                        decoding="async"
                        className="h-full w-full origin-center scale-[1.12] object-contain"
                        onError={handleCarThumbError}
                      />
                    </span>
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium leading-tight text-slate-200">
                          {name}
                          {c.year ? `\u2002${c.year}` : ''}
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
                      </div>
                      <span
                        className={cn(
                          'w-14 shrink-0 text-right text-sm font-bold tabular-nums',
                          piClassColor[maxClass] ?? 'text-muted',
                        )}
                      >
                        {maxClass} {c.maxPi}
                      </span>
                    </div>
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
