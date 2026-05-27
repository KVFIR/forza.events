import {useTranslation} from 'react-i18next';
import {ConvoyLeaderPicker, type ConvoyLeaderSelection} from '../../../components/ConvoyLeaderPicker';
import {PublishTargetPicker} from '../../../components/PublishTargetPicker';
import {Alert} from '../../../components/ui/Alert';
import {hasGamertag} from '../../../lib/gamertag';
import {Divider} from '../components/Field';
import type {FieldErrors} from '../types';

type Props = {
  token: string | null;
  accessToken: string;
  hostDiscordId: string;
  hostGamertag?: string;
  guildId: string;
  guildName: string;
  channelId: string;
  lockGuild: boolean;
  lockChannel: boolean;
  lobbyLeaderIsHost: boolean;
  lobbyLeaderGamertag: string;
  lobbyLeaderSelection: ConvoyLeaderSelection | null;
  fieldErrors: FieldErrors;
  onGuildChange: (id: string, name: string) => void;
  onChannelChange: (id: string) => void;
  onLobbyLeaderIsHost: (v: boolean) => void;
  onLobbyLeaderGamertag: (v: string) => void;
  onLobbyLeaderSelect: (member: ConvoyLeaderSelection | null) => void;
};

export function TargetStep({
  token,
  accessToken,
  hostDiscordId,
  hostGamertag,
  guildId,
  guildName,
  channelId,
  lockGuild,
  lockChannel,
  lobbyLeaderIsHost,
  lobbyLeaderGamertag,
  lobbyLeaderSelection,
  fieldErrors,
  onGuildChange,
  onChannelChange,
  onLobbyLeaderIsHost,
  onLobbyLeaderGamertag,
  onLobbyLeaderSelect,
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

      <Divider />

      <div>
        <p className="text-sm font-medium text-slate-200">{t('create.convoyLeader')}</p>
        <p className="mt-0.5 text-xs text-muted">{t('create.convoyLeaderHint')}</p>
        <label className="mt-3 flex cursor-pointer items-center justify-between gap-3">
          <span className="text-sm text-slate-300">{t('create.iAmConvoyLeader')}</span>
          <input
            type="checkbox"
            checked={lobbyLeaderIsHost}
            onChange={(e) => onLobbyLeaderIsHost(e.target.checked)}
            className="h-4 w-4 accent-white"
          />
        </label>
        {lobbyLeaderIsHost && !hasGamertag(hostGamertag) && (
          <Alert variant="warning" className="mt-2">
            {t('create.convoyLeaderProfileWarning')}
          </Alert>
        )}
        {!lobbyLeaderIsHost && (
          <ConvoyLeaderPicker
            accessToken={accessToken}
            guildId={guildId}
            hostDiscordId={hostDiscordId}
            selected={lobbyLeaderSelection}
            gamertag={lobbyLeaderGamertag}
            onSelect={onLobbyLeaderSelect}
            onGamertagChange={onLobbyLeaderGamertag}
            invalid={Boolean(fieldErrors.lobbyLeaderGamertag || fieldErrors.lobbyLeaderDiscordId)}
            error={fieldErrors.lobbyLeaderDiscordId ?? fieldErrors.lobbyLeaderGamertag ?? null}
          />
        )}
      </div>
    </div>
  );
}
