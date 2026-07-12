import {useTranslation} from 'react-i18next';
import {ParticipantDisplayNames} from '../../../components/ParticipantDisplayNames';
import {UserAvatar} from '../../../components/UserAvatar';
import {formatLobbyCount} from '../../../lib/constants';
import type {EventParticipant} from '../../../lib/types';
import type {RosterConvoyLeader, RosterGroup} from '../../../lib/eventRoster';
import type {EventDetailViewModel} from '../eventDetailView';
import {cn} from '../../../lib/cn';

type Props = {
  view: Pick<EventDetailViewModel, 'ev' | 'groups' | 'waitlist' | 'isHost'>;
  viewerDiscordId: string;
};

function LeaderCard({
  leader,
  hostDiscordId,
}: {
  leader: RosterConvoyLeader;
  hostDiscordId: string;
}) {
  const {t} = useTranslation();
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-2',
        leader.isYou ? 'border-accent-green/25 bg-accent-green/10' : 'border-white/[0.06] bg-card',
      )}
    >
      <UserAvatar
        src={leader.avatarUrl}
        name={leader.username ?? leader.gamertag}
        size="xs"
        variant="green"
      />
      <div className="min-w-0">
        <ParticipantDisplayNames gamertag={leader.gamertag} username={leader.username ?? ''} />
        <p className="text-[9px] font-bold uppercase tracking-widest text-accent-green/90">
          {t('eventDetail.convoyLeaderBadge')}
          {leader.isYou ? t('eventDetail.youSuffix') : ''}
          {leader.discordId === hostDiscordId ? t('eventDetail.hostSuffix') : ''}
        </p>
      </div>
    </div>
  );
}

function DriverCard({
  p,
  viewerDiscordId,
  isHost,
  hostDiscordId,
}: {
  p: EventParticipant;
  viewerDiscordId: string;
  isHost: boolean;
  hostDiscordId: string;
}) {
  const {t} = useTranslation();
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-2',
        p.discordId === viewerDiscordId
          ? 'border-accent-purple/25 bg-accent-purple/10'
          : 'border-white/[0.06] bg-card',
      )}
    >
      <UserAvatar src={p.avatarUrl} name={p.gamertag ?? p.username} size="xs" variant="purple" />
      <div className="min-w-0">
        <ParticipantDisplayNames
          gamertag={p.gamertag}
          username={p.username}
          showDiscordUsername={isHost && p.discordId !== hostDiscordId}
        />
        {p.discordId === viewerDiscordId ? (
          <p className="text-[9px] font-bold uppercase tracking-widest text-accent-purple-light">
            {t('common.you')}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function EventDetailParticipants({view, viewerDiscordId}: Props) {
  const {t} = useTranslation();
  const {ev, groups, waitlist, isHost} = view;
  const multiGroup = groups.length > 1;

  function groupCount(group: RosterGroup): number {
    return ev.participants.filter(
      (p) => !p.waitlisted && (p.groupIndex ?? 1) === group.groupIndex,
    ).length;
  }

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-white">{t('eventDetail.participants')}</p>
        <span className="text-xs tabular-nums text-muted">
          {formatLobbyCount(ev.currentPlayers, view.ev.maxPlayers * groups.length)}
        </span>
      </div>

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

            {group.leader ? (
              <LeaderCard leader={group.leader} hostDiscordId={ev.hostDiscordId} />
            ) : null}

            {group.drivers.length === 0 ? (
              <p className="text-sm text-muted">
                {group.leader ? t('eventDetail.noDriversYet') : t('eventDetail.noParticipantsYet')}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {group.drivers.map((p) => (
                  <DriverCard
                    key={p.discordId}
                    p={p}
                    viewerDiscordId={viewerDiscordId}
                    isHost={isHost}
                    hostDiscordId={ev.hostDiscordId}
                  />
                ))}
              </div>
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
                  <span className="w-5 shrink-0 text-center text-xs font-bold tabular-nums text-muted">
                    {i + 1}
                  </span>
                  <UserAvatar
                    src={p.avatarUrl}
                    name={p.gamertag ?? p.username}
                    size="xs"
                    variant="neutral"
                  />
                  <div className="min-w-0">
                    <ParticipantDisplayNames
                      gamertag={p.gamertag}
                      username={p.username}
                      showDiscordUsername={isHost && p.discordId !== ev.hostDiscordId}
                    />
                    {p.discordId === viewerDiscordId ? (
                      <p className="text-[9px] font-bold uppercase tracking-widest text-accent-purple-light">
                        {t('common.you')}
                      </p>
                    ) : null}
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
