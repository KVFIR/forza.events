import {useLayoutEffect, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {ParticipantDisplayNames} from '../../../components/ParticipantDisplayNames';
import {UserAvatar} from '../../../components/UserAvatar';
import {formatLobbyCount} from '../../../lib/constants';
import type {EventParticipant} from '../../../lib/types';
import type {RosterConvoyLeader, RosterGroup} from '../../../lib/eventRoster';
import type {EventDetailViewModel} from '../eventDetailView';
import {cn} from '../../../lib/cn';

type Props = {
  view: Pick<EventDetailViewModel, 'ev' | 'groups' | 'waitlist'>;
  viewerDiscordId: string;
};

function SeatNumber({n}: {n: number}) {
  return (
    <span className="w-5 shrink-0 text-center text-xs font-bold tabular-nums text-muted">{n}</span>
  );
}

function primaryTextWidth(primary: HTMLElement): number {
  const node = primary.firstChild;
  if (node instanceof Text && node.textContent) {
    const range = document.createRange();
    range.selectNodeContents(node);
    return range.getBoundingClientRect().width;
  }
  return primary.scrollWidth;
}

function LeaderCard({
  leader,
  hostDiscordId,
  position,
}: {
  leader: RosterConvoyLeader;
  hostDiscordId: string;
  position: number;
}) {
  const {t} = useTranslation();
  const isHost = leader.discordId === hostDiscordId;
  const badgeClass =
    'shrink-0 text-right text-[9px] font-bold uppercase leading-tight tracking-wide text-accent-green/90';
  const cardRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const badgeWidthRef = useRef(0);
  const hideBadgesRef = useRef(false);
  const [hideBadges, setHideBadges] = useState(false);

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const sync = () => {
      const primary = card.querySelector<HTMLElement>('.min-w-0.flex-1 > p');
      if (!primary) return;

      const measuredBadgeW = badgeRef.current?.offsetWidth ?? 0;
      if (measuredBadgeW > 0) {
        badgeWidthRef.current = measuredBadgeW;
      }

      const textW = primaryTextWidth(primary);
      const slotW = primary.clientWidth;
      const badgeW = badgeWidthRef.current;
      const gap = 8;
      const showBadges = hideBadgesRef.current
        ? badgeW > 0 && textW <= slotW - badgeW - gap + 1
        : textW <= slotW + 1;
      const nextHidden = !showBadges;

      if (hideBadgesRef.current === nextHidden) return;

      hideBadgesRef.current = nextHidden;
      setHideBadges(nextHidden);
    };

    const ro = new ResizeObserver(sync);
    ro.observe(card);
    sync();
    return () => ro.disconnect();
  }, [leader.gamertag, leader.username, isHost, t]);

  return (
    <div
      ref={cardRef}
      className="flex items-center gap-2 rounded-lg border border-accent-green/25 bg-accent-green/10 px-3 py-2"
    >
      <SeatNumber n={position} />
      <UserAvatar
        src={leader.avatarUrl}
        name={leader.username ?? leader.gamertag}
        size="xs"
        variant="green"
      />
      <div className="min-w-0 flex-1">
        <ParticipantDisplayNames gamertag={leader.gamertag} username={leader.username ?? ''} />
      </div>
      {hideBadges ? null : (
        <div ref={badgeRef} className={cn(badgeClass, isHost && 'flex flex-col gap-0.5')}>
          <span>{t('eventDetail.convoyLeaderBadgeShort')}</span>
          {isHost ? <span>{t('eventDetail.hostBadgeShort')}</span> : null}
        </div>
      )}
    </div>
  );
}

function DriverCard({
  p,
  viewerDiscordId,
  position,
}: {
  p: EventParticipant;
  viewerDiscordId: string;
  position: number;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-2',
        p.discordId === viewerDiscordId
          ? 'border-accent-purple/25 bg-accent-purple/10'
          : 'border-white/[0.06] bg-card',
      )}
    >
      <SeatNumber n={position} />
      <UserAvatar src={p.avatarUrl} name={p.gamertag ?? p.username} size="xs" variant="purple" />
      <div className="min-w-0">
        <ParticipantDisplayNames gamertag={p.gamertag} username={p.username} />
      </div>
    </div>
  );
}

export function EventDetailParticipants({view, viewerDiscordId}: Props) {
  const {t} = useTranslation();
  const {ev, groups, waitlist} = view;
  const multiGroup = groups.length > 1;

  function groupCount(group: RosterGroup): number {
    return ev.participants.filter(
      (p) => !p.waitlisted && (p.groupIndex ?? 1) === group.groupIndex,
    ).length;
  }

  return (
    <div className="mt-6">
      <p className="mb-3 text-sm font-semibold text-white">{t('eventDetail.participants')}</p>

      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.groupIndex} className="space-y-2">
            {multiGroup ? (
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-muted">
                  {t('eventDetail.group', {n: group.groupIndex})}
                </p>
                <span className="text-xs tabular-nums text-muted">
                  {formatLobbyCount(groupCount(group), ev.maxPlayers)}
                </span>
              </div>
            ) : null}

            {group.leader || group.drivers.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {group.leader ? (
                    <LeaderCard
                      leader={group.leader}
                      hostDiscordId={ev.hostDiscordId}
                      position={1}
                    />
                  ) : null}
                  {group.drivers.map((p, i) => (
                    <DriverCard
                      key={p.discordId}
                      p={p}
                      viewerDiscordId={viewerDiscordId}
                      position={(group.leader ? 1 : 0) + i + 1}
                    />
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted">{t('eventDetail.noParticipantsYet')}</p>
            )}
          </div>
        ))}

        {waitlist.length > 0 ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-muted">
                {t('eventDetail.waitlist')}
              </p>
              <span className="text-xs tabular-nums text-muted">{waitlist.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {waitlist.map((p, i) => (
                <div
                  key={p.discordId}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2',
                    p.discordId === viewerDiscordId
                      ? 'border-accent-purple/25 bg-accent-purple/10'
                      : 'border-white/[0.06] bg-card',
                  )}
                >
                  <SeatNumber n={i + 1} />
                  <UserAvatar
                    src={p.avatarUrl}
                    name={p.gamertag ?? p.username}
                    size="xs"
                    variant="neutral"
                  />
                  <div className="min-w-0">
                    <ParticipantDisplayNames gamertag={p.gamertag} username={p.username} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
