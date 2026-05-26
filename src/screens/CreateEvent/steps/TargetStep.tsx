import {useTranslation} from 'react-i18next';
import {PublishTargetPicker} from '../../../components/PublishTargetPicker';
import type {FieldErrors} from '../types';

type Props = {
  token: string | null;
  accessToken: string;
  guildId: string;
  guildName: string;
  channelId: string;
  lockGuild: boolean;
  lockChannel: boolean;
  fieldErrors: FieldErrors;
  onGuildChange: (id: string, name: string) => void;
  onChannelChange: (id: string) => void;
};

export function TargetStep({
  token,
  accessToken,
  guildId,
  guildName,
  channelId,
  lockGuild,
  lockChannel,
  fieldErrors,
  onGuildChange,
  onChannelChange,
}: Props) {
  const {t} = useTranslation();

  if (!token) {
    return <p className="text-sm text-muted">{t('auth.openInDiscordTarget')}</p>;
  }

  return (
    <div className="space-y-3">
      {(fieldErrors.targetGuildId || fieldErrors.targetChannelId) && (
        <p role="alert" className="text-xs text-red-300/90">
          {fieldErrors.targetGuildId ?? fieldErrors.targetChannelId}
        </p>
      )}
      <PublishTargetPicker
        accessToken={accessToken}
        guildId={guildId}
        guildName={guildName}
        channelId={channelId}
        lockGuild={lockGuild}
        lockChannel={lockChannel}
        onGuildChange={onGuildChange}
        onChannelChange={onChannelChange}
      />
      {!lockGuild && (
        <p className="text-xs text-muted">{t('create.targetHint')}</p>
      )}
    </div>
  );
}
