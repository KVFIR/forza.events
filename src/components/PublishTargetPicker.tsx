import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {listChannels, listGuilds} from '../lib/api';
import {getGuildContext} from '../lib/discord';
import {
  botInstallOpensExternally,
  buildBotInstallUrl,
  openBotInstallUrl,
} from '../lib/discordInstall';
import {Button} from './ui/Button';
import {InlineLoading} from './ui/InlineLoading';

type Props = {
  accessToken: string;
  guildId: string;
  guildName?: string;
  channelId: string;
  lockGuild?: boolean;
  lockChannel?: boolean;
  onGuildChange: (guildId: string, guildName: string) => void;
  onChannelChange: (channelId: string) => void;
};

export function PublishTargetPicker({
  accessToken,
  guildId,
  guildName,
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
  const guildRequestRef = useRef(0);
  const channelRequestRef = useRef(0);
  const canAddBot = Boolean(buildBotInstallUrl());
  const installInBrowser = botInstallOpensExternally();
  const activityGuildId = getGuildContext().guildId;

  const guildOptions = useMemo(() => {
    if (guildId && guildName && !guilds.some((g) => g.id === guildId)) {
      return [{id: guildId, name: guildName}, ...guilds];
    }
    return guilds;
  }, [guilds, guildId, guildName]);

  const channelOptions = useMemo(() => {
    if (channelId && !channels.some((c) => c.id === channelId)) {
      return [{id: channelId, name: 'selected-channel'}, ...channels];
    }
    return channels;
  }, [channels, channelId]);

  const loadGuilds = useCallback(() => {
    const requestId = ++guildRequestRef.current;
    setLoadingGuilds(true);
    setError(null);
    void listGuilds(accessToken)
      .then((r) => {
        if (requestId !== guildRequestRef.current) return;
        setGuilds(r.guilds);
        setGuildHint(r.hint ?? null);
      })
      .catch((e) => {
        if (requestId !== guildRequestRef.current) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (requestId === guildRequestRef.current) setLoadingGuilds(false);
      });
  }, [accessToken]);

  const loadChannels = useCallback(() => {
    if (!guildId) {
      channelRequestRef.current += 1;
      setChannels([]);
      setLoadingChannels(false);
      return;
    }
    const requestGuildId = guildId;
    const requestId = ++channelRequestRef.current;
    setChannels([]);
    setLoadingChannels(true);
    setError(null);
    void listChannels(accessToken, requestGuildId)
      .then((r) => {
        if (requestId !== channelRequestRef.current) return;
        setChannels(r.channels);
      })
      .catch((e) => {
        if (requestId !== channelRequestRef.current) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (requestId === channelRequestRef.current) setLoadingChannels(false);
      });
  }, [accessToken, guildId]);

  useEffect(() => {
    loadGuilds();
  }, [loadGuilds]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  function handleAddBot() {
    const prefillCurrentServer =
      guilds.length === 0 && activityGuildId ? {guildId: activityGuildId} : undefined;
    void openBotInstallUrl(prefillCurrentServer);
  }

  const botInstallActions =
    canAddBot && !lockGuild ? (
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          type="button"
          variant={guilds.length === 0 ? 'primary' : 'secondary'}
          className="h-9 px-3 text-xs"
          onClick={handleAddBot}
        >
          {guilds.length === 0 ? 'Add to server' : 'Add to another server'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-9 px-3 text-xs"
          onClick={loadGuilds}
          disabled={loadingGuilds}
        >
          Refresh list
        </Button>
      </div>
    ) : null;

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
            {botInstallActions}
            <p className="text-[10px] leading-relaxed text-muted">
              One install adds the bot so events can be announced in a channel. Launching from App
              Launcher alone is not enough.
              {installInBrowser
                ? ' Discord will open your browser to approve — finish there, then return to this Activity and tap Refresh list.'
                : ' After approving, tap Refresh list.'}
            </p>
          </div>
        ) : (
          <>
            <select
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-white"
              value={guildId}
              disabled={lockGuild}
              onChange={(e) => {
                const next = guildOptions.find((g) => g.id === e.target.value);
                onGuildChange(e.target.value, next?.name ?? 'Server');
              }}
            >
              <option value="">Select a server</option>
              {guildOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            {botInstallActions}
            <p className="mt-1.5 text-[10px] leading-relaxed text-muted">
              Only servers where you manage the server and FORZA.EVENTS is installed are listed.
              Use Add to another server to install the bot elsewhere, then refresh.
              {installInBrowser &&
                ' Install opens in your browser; return to the Activity when done.'}
            </p>
          </>
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
        ) : (
          <>
            <select
              key={guildId}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-sm text-white disabled:opacity-60"
              value={channelId}
              disabled={lockChannel || !guildId || loadingChannels}
              onChange={(e) => onChannelChange(e.target.value)}
            >
              <option value="">Select a channel</option>
              {channelOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name === 'selected-channel' ? 'Selected channel' : `#${c.name}`}
                </option>
              ))}
            </select>
            {loadingChannels && (
              <p className="mt-1.5 text-[10px] text-muted">Refreshing channel list…</p>
            )}
          </>
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
  guildName,
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
            guildName={guildName}
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
