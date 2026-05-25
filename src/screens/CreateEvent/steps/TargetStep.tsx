import {PublishTargetPicker} from '../../../components/PublishTargetPicker';
import type {FieldErrors} from '../types';

type Props = {
  token: string | null;
  accessToken: string;
  guildId: string;
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
  channelId,
  lockGuild,
  lockChannel,
  fieldErrors,
  onGuildChange,
  onChannelChange,
}: Props) {
  if (!token) {
    return (
      <p className="text-sm text-muted">Sign in with Discord to choose a server and channel.</p>
    );
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
        channelId={channelId}
        lockGuild={lockGuild}
        lockChannel={lockChannel}
        onGuildChange={onGuildChange}
        onChannelChange={onChannelChange}
      />
      <p className="text-xs text-muted">
        Pick where the event will be announced. You can choose the channel on the final publish step
        if it is not set yet.
      </p>
    </div>
  );
}
