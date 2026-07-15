import {useTranslation} from 'react-i18next';
import {UserAvatar} from '../../../components/UserAvatar';
import {TextButton} from '../../../components/ui/TextButton';
import {openExternalUrl} from '../../../lib/discordInstall';
import {isPlaceholderGuildName} from '../../../lib/guildDisplay';
import {resolveOrganiserLabel} from '../../../lib/organiser';
import type {ForzaEvent} from '../../../lib/types';

type Props = {
  event: ForzaEvent;
};

export function EventDetailOrganiser({event}: Props) {
  const {t} = useTranslation();
  const label = resolveOrganiserLabel(event);
  const hasGuild =
    Boolean(event.guildName?.trim()) && !isPlaceholderGuildName(event.guildName);
  const showGuildBrand = hasGuild && (event.guildIconUrl || event.guildInviteUrl);

  if (!showGuildBrand) {
    return (
      <p className="mt-8 text-xs text-muted">
        {t('common.by')} {label}
      </p>
    );
  }

  return (
    <div className="mt-8 flex flex-wrap items-center gap-x-2.5 gap-y-1">
      <UserAvatar
        src={event.guildIconUrl}
        name={label}
        size="xs"
        variant="neutral"
        className="!rounded-md"
      />
      <p className="text-xs text-muted">
        {t('common.by')} {label}
      </p>
      {event.guildInviteUrl ? (
        <>
          <span className="text-xs text-muted" aria-hidden>
            ·
          </span>
          <TextButton
            tone="action"
            className="!text-xs"
            onClick={() => void openExternalUrl(event.guildInviteUrl!)}
          >
            {t('eventDetail.joinServer')}
          </TextButton>
        </>
      ) : null}
    </div>
  );
}
