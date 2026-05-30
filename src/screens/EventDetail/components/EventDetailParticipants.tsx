import {useTranslation} from 'react-i18next';
import {ParticipantDisplayNames} from '../../../components/ParticipantDisplayNames';
import {UserAvatar} from '../../../components/UserAvatar';
import {formatLobbyCount} from '../../../lib/constants';
import type {EventDetailViewModel} from '../eventDetailView';
import {cn} from '../../../lib/cn';

type Props = {
  view: Pick<EventDetailViewModel, 'ev' | 'convoyLeader' | 'registeredDrivers' | 'isHost'>;
  viewerDiscordId: string;
};

export function EventDetailParticipants({view, viewerDiscordId}: Props) {
  const {t} = useTranslation();
  const {ev, convoyLeader, registeredDrivers, isHost} = view;

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-white">{t('eventDetail.participants')}</p>
        <span className="text-xs tabular-nums text-muted">
          {formatLobbyCount(ev.currentPlayers)}
        </span>
      </div>
      <div className="space-y-2">
        {convoyLeader ? (
          <div
            className={cn(
              'flex items-center gap-2 rounded-lg border px-3 py-2',
              convoyLeader.isYou
                ? 'border-accent-green/25 bg-accent-green/10'
                : 'border-white/[0.06] bg-card',
            )}
          >
            <UserAvatar
              src={convoyLeader.avatarUrl}
              name={convoyLeader.username ?? convoyLeader.gamertag}
              size="xs"
              variant="green"
            />
            <div className="min-w-0">
              <ParticipantDisplayNames
                gamertag={convoyLeader.gamertag}
                username={convoyLeader.username ?? ''}
              />
              <p className="text-[9px] font-bold uppercase tracking-widest text-accent-green/90">
                {t('eventDetail.convoyLeaderBadge')}
                {convoyLeader.isYou ? t('eventDetail.youSuffix') : ''}
                {convoyLeader.discordId === ev.hostDiscordId ? t('eventDetail.hostSuffix') : ''}
              </p>
            </div>
          </div>
        ) : null}
        {registeredDrivers.length === 0 ? (
          <p className="text-sm text-muted">
            {convoyLeader ? t('eventDetail.noDriversYet') : t('eventDetail.noParticipantsYet')}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {registeredDrivers.map((p) => (
              <div
                key={p.discordId}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-2',
                  p.discordId === viewerDiscordId
                    ? 'border-accent-purple/25 bg-accent-purple/10'
                    : 'border-white/[0.06] bg-card',
                )}
              >
                <UserAvatar
                  src={p.avatarUrl}
                  name={p.gamertag ?? p.username}
                  size="xs"
                  variant="purple"
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
        )}
      </div>
    </div>
  );
}
