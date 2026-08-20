import {useTranslation} from 'react-i18next';
import {UserAvatar} from '../../../components/UserAvatar';
import {TextButton} from '../../../components/ui/TextButton';
import {formatDiscordHandle} from '../../../lib/discordHandle';
import {openExternalUrl} from '../../../lib/discordInstall';
import {resolveOrganiserGuildName} from '../../../lib/organiser';
import type {ForzaEvent} from '../../../lib/types';

type Props = {
  event: ForzaEvent;
};

export function EventDetailOrganiser({event}: Props) {
  const {t} = useTranslation();
  const guild = resolveOrganiserGuildName(event);
  const hostMention = formatDiscordHandle(event.hostUsername);
  const hostId = event.hostDiscordId.trim();
  const invite = event.guildInviteUrl;
  if (!guild && !hostMention) return null;

  const guildIcon = event.guildIconUrl ? (
    <UserAvatar
      src={event.guildIconUrl}
      name={guild ?? ''}
      size="xs"
      variant="neutral"
      className="!rounded-md"
    />
  ) : null;

  return (
    <div className="mt-8 flex flex-wrap items-center gap-x-2.5 gap-y-1">
      {guild ? (
        invite ? (
          <TextButton
            tone="action"
            className="inline-flex items-center gap-2.5"
            onClick={() => void openExternalUrl(invite)}
          >
            {guildIcon}
            {guild}
          </TextButton>
        ) : (
          <span className="inline-flex items-center gap-2.5 text-xs text-muted">
            {guildIcon}
            {guild}
          </span>
        )
      ) : null}
      {hostMention ? (
        <>
          {guild ? (
            <span className="text-xs text-muted" aria-hidden>
              ·
            </span>
          ) : null}
          <span className="inline-flex min-w-0 items-baseline gap-1 text-xs text-muted">
            {t('eventDetail.hostedBy')}
            {hostId ? (
              <TextButton
                tone="action"
                title={hostMention}
                onClick={() =>
                  void openExternalUrl(`https://discord.com/users/${hostId}`)
                }
              >
                {hostMention}
              </TextButton>
            ) : (
              <span>{hostMention}</span>
            )}
          </span>
        </>
      ) : null}
    </div>
  );
}
