import {useCallback, useEffect, useState} from 'react';
import {listChannels, listGuilds} from '../lib/api';
import {getGuildContext} from '../lib/discord';
import {buildBotInstallUrl, getBotInstallRedirectUri, openBotInstallUrl} from '../lib/discordInstall';
import {Button} from './ui/Button';
import {InlineLoading} from './ui/InlineLoading';

type Props = {
  accessToken: string;
  guildId: string;
  channelId: string;
  lockGuild?: boolean;
  lockChannel?: boolean;
  onGuildChange: (guildId: string, guildName: string) => void;
  onChannelChange: (channelId: string) => void;
};

export function PublishTargetPicker({
  accessToken,
  guildId,
  channelId,
  lockGuild = false,
  lockChannel = false,
  onGuildChange,
  onChannelChange,
}: Props) {
  const [guilds, setGuilds] = useState<{id: string; name: string}[]>([]);
  const [channels, setChannels] = useState<{id: string; name: string}[]>([]);
  const [guildHint, setGuildHint] = useState<string | null>(null);
  const [loadingGuilds, setLoadingGuilds] = useState(true);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const botInstallRedirect = getBotInstallRedirectUri();
  const canAddBot = Boolean(buildBotInstallUrl());
  const activityGuildId = getGuildContext().guildId;

  const loadGuilds = useCallback(() => {
    setLoadingGuilds(true);
    setError(null);
    void listGuilds(accessToken)
      .then((r) => {
        setGuilds(r.guilds);
        setGuildHint(r.hint ?? null);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoadingGuilds(false));
  }, [accessToken]);

  const loadChannels = useCallback(() => {
    if (!guildId) {
      setChannels([]);
      return;
    }
    setLoadingChannels(true);
    setError(null);
    void listChannels(accessToken, guildId)
      .then((r) => setChannels(r.channels))
      .catch((e) => setError(String(e)))
      .finally(() => setLoadingChannels(false));
  }, [accessToken, guildId]);

  useEffect(() => {
    loadGuilds();
  }, [loadGuilds]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
          Discord server
        </p>
        {loadingGuilds ? (
          <InlineLoading label="Loading servers" />
        ) : guilds.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              {guildHint ??
                'Add FORZA.EVENTS to a Discord server you manage, then refresh the list.'}
            </p>
            {canAddBot && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="primary"
                  className="h-9 px-3 text-xs"
                  onClick={() => {
                    void openBotInstallUrl(
                      activityGuildId ? {guildId: activityGuildId} : undefined,
                    );
                  }}
                >
                  Add to server
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 px-3 text-xs"
                  onClick={loadGuilds}
                  disabled={loadingGuilds}
                >
                  Refresh list
                </Button>
              </div>
            )}
            <p className="text-[10px] leading-relaxed text-muted">
              One install adds the bot so events can be announced in a channel. Launching from App
              Launcher alone is not enough. After approving in Discord, return here and tap Refresh
              list.
            </p>
            {!botInstallRedirect && (
              <p className="text-[10px] leading-relaxed text-amber-200/90">
                Set <code className="text-amber-50">APP_ORIGIN</code> (or{' '}
                <code className="text-amber-50">BOT_INSTALL_REDIRECT_URI</code>) in env and add that
                URL under OAuth2 → Redirects in the Discord Developer Portal.
              </p>
            )}
          </div>
        ) : (
          <select
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-white"
            value={guildId}
            disabled={lockGuild}
            onChange={(e) => {
              const next = guilds.find((g) => g.id === e.target.value);
              onGuildChange(e.target.value, next?.name ?? 'Server');
              onChannelChange('');
            }}
          >
            <option value="">Select a server</option>
            {guilds.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        )}
        {lockGuild && (
          <p className="mt-1 text-[10px] text-muted">Server is locked after publish.</p>
        )}
      </div>

      <div>
        <p className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
          Channel
        </p>
        {!guildId ? (
          <p className="text-sm text-muted">Choose a server first.</p>
        ) : loadingChannels ? (
          <InlineLoading label="Loading channels" />
        ) : (
          <select
            className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-white"
            value={channelId}
            disabled={lockChannel || !guildId}
            onChange={(e) => onChannelChange(e.target.value)}
          >
            <option value="">Select a channel</option>
            {channels.map((c) => (
              <option key={c.id} value={c.id}>
                #{c.name}
              </option>
            ))}
          </select>
        )}
        {lockChannel && (
          <p className="mt-1 text-[10px] text-muted">Channel is locked after publish.</p>
        )}
      </div>

      {error && (
        <div className="space-y-2">
          <p className="text-xs text-accent-red">{error}</p>
          <Button
            type="button"
            variant="ghost"
            className="h-auto px-0 py-0 text-xs font-semibold text-accent-purple"
            onClick={() => {
              if (loadingGuilds || guilds.length === 0) loadGuilds();
              else loadChannels();
            }}
          >
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}

export function PublishTargetModal({
  accessToken,
  guildId,
  channelId,
  onGuildChange,
  onChannelChange,
  onConfirm,
  onCancel,
  confirming,
}: Props & {
  onConfirm: () => void;
  onCancel: () => void;
  confirming?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/[0.1] bg-card p-5">
        <h2 className="text-lg font-bold text-white">Choose publish target</h2>
        <p className="mt-1 text-sm text-muted">
          Pick the server and channel. These cannot be changed after publish.
        </p>
        <div className="mt-4">
          <PublishTargetPicker
            accessToken={accessToken}
            guildId={guildId}
            channelId={channelId}
            onGuildChange={onGuildChange}
            onChannelChange={onChannelChange}
          />
        </div>
        <div className="mt-5 flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            className="flex-1"
            disabled={!guildId || !channelId || confirming}
            onClick={onConfirm}
          >
            {confirming ? 'Publishing…' : 'Publish'}
          </Button>
        </div>
      </div>
    </div>
  );
}
