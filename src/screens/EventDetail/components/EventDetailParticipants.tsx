import {useLayoutEffect, useRef, useState, type ReactNode, type RefObject} from 'react';
import {useTranslation} from 'react-i18next';
import {ParticipantDisplayNames} from '../../../components/ParticipantDisplayNames';
import {UserAvatar} from '../../../components/UserAvatar';
import {TextButton} from '../../../components/ui/TextButton';
import {formatLobbyCount} from '../../../lib/constants';
import {nextHideTrailing, nextSharedHideRating} from '../../../lib/rosterOverflow';
import type {EventParticipant} from '../../../lib/types';
import type {RosterConvoyLeader, RosterGroup} from '../../../lib/eventRoster';
import type {EventDetailViewModel} from '../eventDetailView';
import {EventDetailBalanceGroups} from './EventDetailBalanceGroups';
import {EventDetailChangeGroupLeader} from './EventDetailChangeGroupLeader';
import {cn} from '../../../lib/cn';

type Props = {
  view: Pick<
    EventDetailViewModel,
    'ev' | 'groups' | 'waitlist' | 'canChangeGroupLeader' | 'showGroupRoster' | 'canBalanceGroupRoster' | 'canShuffleGroupRoster' | 'canBalanceShuffleGroupRoster'
  >;
  viewerDiscordId: string;
  accessToken: string | null;
  onRosterChanged: () => void;
};

function SeatNumber({n}: {n: number}) {
  return (
    <span className="w-5 shrink-0 text-center text-xs font-bold tabular-nums text-muted">{n}</span>
  );
}

function ParticipantRating({
  rating,
  show,
  hidden,
}: {
  rating?: number;
  show?: boolean;
  hidden?: boolean;
}) {
  const {t} = useTranslation();
  if (!show || hidden) return null;
  const tbd = rating == null;
  return (
    <span
      data-roster-rating=""
      className={cn(
        'shrink-0 text-xs font-semibold tabular-nums',
        tbd ? 'text-muted' : 'text-slate-300',
      )}
      aria-label={`${t('profile.rating')} ${tbd ? t('profile.ratingTbd') : rating}`}
    >
      {tbd ? t('profile.ratingTbd') : rating}
    </span>
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

/** Per-card: drop leader/host badges only after the shared rating hide. */
function useRosterBadgeOverflow(
  gamertag: string | undefined,
  username: string,
  hasBadges: boolean,
  hideRating: boolean,
  locale: string,
) {
  const cardRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const badgeWRef = useRef(0);
  const hideBadgesRef = useRef(false);
  const [hideBadges, setHideBadges] = useState(false);

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card || !hasBadges) return;

    const sync = () => {
      const primary = card.querySelector<HTMLElement>('.min-w-0.flex-1 > p');
      if (!primary) return;

      const badgeW = badgeRef.current?.offsetWidth ?? 0;
      if (badgeW > 0) badgeWRef.current = badgeW;

      const nextHidden = nextHideTrailing(
        hideBadgesRef.current,
        primaryTextWidth(primary),
        primary.clientWidth,
        badgeWRef.current,
      );

      if (nextHidden !== hideBadgesRef.current) {
        hideBadgesRef.current = nextHidden;
        setHideBadges(nextHidden);
      }
    };

    const ro = new ResizeObserver(sync);
    ro.observe(card);
    sync();
    return () => ro.disconnect();
  }, [gamertag, username, hasBadges, hideRating, locale]);

  return {cardRef, badgeRef, hideBadges};
}

function useSharedRatingHide(
  listRef: RefObject<HTMLDivElement>,
  enabled: boolean,
  rosterKey: string,
) {
  const hideRef = useRef(false);
  const ratingWRef = useRef(0);
  const [hideRating, setHideRating] = useState(false);

  useLayoutEffect(() => {
    if (!enabled) {
      hideRef.current = false;
      setHideRating(false);
      return;
    }

    const root = listRef.current;
    if (!root) return;

    const sync = () => {
      const cards = [...root.querySelectorAll<HTMLElement>('[data-roster-card]')].map((card) => {
        const primary = card.querySelector<HTMLElement>('.min-w-0.flex-1 > p');
        const ratingEl = card.querySelector<HTMLElement>('[data-roster-rating]');
        const liveW = ratingEl?.offsetWidth ?? 0;
        if (liveW > ratingWRef.current) ratingWRef.current = liveW;
        const hasRating = card.dataset.hasRating === '1';
        return {
          textW: primary ? primaryTextWidth(primary) : 0,
          slotW: primary?.clientWidth ?? 0,
          ratingW: hasRating ? (liveW > 0 ? liveW : ratingWRef.current) : 0,
        };
      });
      const next = nextSharedHideRating(hideRef.current, cards);
      if (next !== hideRef.current) {
        hideRef.current = next;
        setHideRating(next);
      }
    };

    const ro = new ResizeObserver(sync);
    ro.observe(root);
    sync();
    return () => ro.disconnect();
    // hideRating lives in hideRef — a dep would re-measure after unmount and loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, rosterKey]);

  return hideRating;
}

function RosterCard({
  className,
  seat,
  avatarSrc,
  avatarName,
  avatarVariant,
  gamertag,
  username,
  rating,
  showRating,
  hideRating,
  badges,
  badgeClassName,
}: {
  className: string;
  seat: number;
  avatarSrc?: string;
  avatarName: string;
  avatarVariant: 'green' | 'purple' | 'neutral';
  gamertag?: string;
  username: string;
  rating?: number;
  showRating?: boolean;
  hideRating?: boolean;
  badges?: ReactNode;
  badgeClassName?: string;
}) {
  const {i18n} = useTranslation();
  const {cardRef, badgeRef, hideBadges} = useRosterBadgeOverflow(
    gamertag,
    username,
    Boolean(badges),
    Boolean(hideRating),
    i18n.language,
  );

  return (
    <div
      ref={cardRef}
      data-roster-card=""
      data-has-rating={showRating ? '1' : '0'}
      className={cn('flex items-center gap-2 rounded-lg border px-3 py-2', className)}
    >
      <SeatNumber n={seat} />
      <UserAvatar src={avatarSrc} name={avatarName} size="xs" variant={avatarVariant} />
      <div className="min-w-0 flex-1">
        <ParticipantDisplayNames gamertag={gamertag} username={username} />
      </div>
      {badges && !hideBadges ? (
        <div ref={badgeRef} className={badgeClassName}>
          {badges}
        </div>
      ) : null}
      <ParticipantRating rating={rating} show={showRating} hidden={hideRating} />
    </div>
  );
}

function LeaderCard({
  leader,
  position,
  showRating,
  hideRating,
}: {
  leader: RosterConvoyLeader;
  position: number;
  showRating: boolean;
  hideRating: boolean;
}) {
  const {t} = useTranslation();

  return (
    <RosterCard
      className="border-accent-green/25 bg-accent-green/10"
      seat={position}
      avatarSrc={leader.avatarUrl}
      avatarName={leader.username ?? leader.gamertag}
      avatarVariant="green"
      gamertag={leader.gamertag}
      username={leader.username ?? ''}
      rating={leader.rating}
      showRating={showRating}
      hideRating={hideRating}
      badgeClassName="shrink-0 text-right text-[10px] font-bold uppercase leading-tight tracking-wide text-accent-green/90"
      badges={<span>{t('eventDetail.convoyLeaderBadgeShort')}</span>}
    />
  );
}

function DriverCard({
  p,
  viewerDiscordId,
  position,
  showRating,
  hideRating,
}: {
  p: EventParticipant;
  viewerDiscordId: string;
  position: number;
  showRating: boolean;
  hideRating: boolean;
}) {
  return (
    <RosterCard
      className={
        p.discordId === viewerDiscordId
          ? 'border-accent-purple/25 bg-accent-purple/10'
          : 'border-white/[0.06] bg-card'
      }
      seat={position}
      avatarSrc={p.avatarUrl}
      avatarName={p.gamertag ?? p.username}
      avatarVariant="purple"
      gamertag={p.gamertag}
      username={p.username}
      rating={p.rating}
      showRating={showRating}
      hideRating={hideRating}
    />
  );
}

export function EventDetailParticipants({
  view,
  viewerDiscordId,
  accessToken,
  onRosterChanged,
}: Props) {
  const {t, i18n} = useTranslation();
  const {ev, groups, waitlist, canChangeGroupLeader, showGroupRoster, canBalanceGroupRoster, canShuffleGroupRoster, canBalanceShuffleGroupRoster} = view;
  const multiGroup = groups.length > 1;
  const showRating = Boolean(ev.isRanked);
  const listRef = useRef<HTMLDivElement>(null);
  const rosterKey = `${i18n.language}:${ev.participants.map((p) => `${p.discordId}:${p.rating ?? ''}`).join(',')}`;
  const hideRating = useSharedRatingHide(listRef, showRating, rosterKey);
  const [changingGroupIndex, setChangingGroupIndex] = useState<number | null>(null);

  function groupCount(group: RosterGroup): number {
    return ev.participants.filter(
      (p) => !p.waitlisted && (p.groupIndex ?? 1) === group.groupIndex,
    ).length;
  }

  return (
    <div className="mt-6">
      {showGroupRoster && accessToken ? (
        <EventDetailBalanceGroups
          event={ev}
          accessToken={accessToken}
          canBalance={canBalanceGroupRoster}
          canShuffle={canShuffleGroupRoster}
          canBalanceShuffle={canBalanceShuffleGroupRoster}
          onBalanced={onRosterChanged}
        >
          {({trigger, error}) => (
            <>
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">{t('eventDetail.participants')}</p>
                {trigger}
              </div>
              {error}
            </>
          )}
        </EventDetailBalanceGroups>
      ) : (
        <p className="mb-3 text-sm font-semibold text-white">{t('eventDetail.participants')}</p>
      )}

      <div ref={listRef} className="space-y-4">
        {groups.map((group) => (
          <div key={group.groupIndex} className="space-y-2">
            {multiGroup || canChangeGroupLeader ? (
              <div className="flex items-center justify-between gap-2">
                {multiGroup ? (
                  <p className="text-xs font-bold uppercase tracking-widest text-muted">
                    {t('eventDetail.group', {n: group.groupIndex})}
                  </p>
                ) : (
                  <span />
                )}
                <div className="ml-auto flex items-center gap-3">
                  {canChangeGroupLeader && accessToken ? (
                    <TextButton
                      type="button"
                      tone="subtle"
                      onClick={() => setChangingGroupIndex(group.groupIndex)}
                    >
                      {t('changeGroupLeader.button')}
                    </TextButton>
                  ) : null}
                  <span className="text-xs tabular-nums text-muted">
                    {formatLobbyCount(groupCount(group), ev.maxPlayers)}
                  </span>
                </div>
              </div>
            ) : null}

            {group.leader || group.drivers.length > 0 ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {group.leader ? (
                    <LeaderCard
                      leader={group.leader}
                      position={1}
                      showRating={showRating}
                      hideRating={hideRating}
                    />
                  ) : null}
                  {group.drivers.map((p, i) => (
                    <DriverCard
                      key={p.discordId}
                      p={p}
                      viewerDiscordId={viewerDiscordId}
                      position={(group.leader ? 1 : 0) + i + 1}
                      showRating={showRating}
                      hideRating={hideRating}
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
                <RosterCard
                  key={p.discordId}
                  className={
                    p.discordId === viewerDiscordId
                      ? 'border-accent-purple/25 bg-accent-purple/10'
                      : 'border-white/[0.06] bg-card'
                  }
                  seat={i + 1}
                  avatarSrc={p.avatarUrl}
                  avatarName={p.gamertag ?? p.username}
                  avatarVariant="neutral"
                  gamertag={p.gamertag}
                  username={p.username}
                  rating={p.rating}
                  showRating={showRating}
                  hideRating={hideRating}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {changingGroupIndex != null && accessToken ? (
        <EventDetailChangeGroupLeader
          event={ev}
          waitlist={waitlist}
          groupIndex={changingGroupIndex}
          accessToken={accessToken}
          open
          onClose={() => setChangingGroupIndex(null)}
          onChanged={onRosterChanged}
        />
      ) : null}
    </div>
  );
}
