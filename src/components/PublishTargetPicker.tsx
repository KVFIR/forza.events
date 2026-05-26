import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {listChannels, listGuilds, validatePublishChannel} from '../lib/api';
import {getGuildContext} from '../lib/discord';
import {
  botInstallOpensExternally,
  buildBotInstallUrl,
  openBotInstallUrl,
} from '../lib/discordInstall';
import {isPlaceholderGuildName} from '../lib/guildDisplay';
import {Button} from './ui/Button';
import {FieldLabel} from './ui/FieldLabel';
import {Select} from './ui/Select';
import {BUSY_LABEL} from './ui/buttonStyles';
import {InlineLoading} from './ui/InlineLoading';
import {ModalBackdrop, ModalPanel} from './ui/ModalShell';
import {TextButton} from './ui/TextButton';

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
  const [validatingChannel, setValidatingChannel] = useState(false);
  const [channelHint, setChannelHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [channelError, setChannelError] = useState<string | null>(null);
  const guildRequestRef = useRef(0);
  const channelRequestRef = useRef(0);
  const channelValidateRef = useRef(0);
  const validatedChannelKeyRef = useRef('');
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
    setChannelHint(null);
    setChannelError(null);
    setLoadingChannels(true);
    setError(null);
    void listChannels(accessToken, requestGuildId)
      .then((r) => {
        if (requestId !== channelRequestRef.current) return;
        setChannels(r.channels);
        setChannelHint(r.hint ?? null);
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
    if (!guildId || lockGuild || guilds.length === 0) return;
    const match = guilds.find((g) => g.id === guildId);
    if (!match) return;
    if (isPlaceholderGuildName(guildName) || guildName !== match.name) {
      onGuildChange(guildId, match.name);
    }
  }, [guildId, guildName, guilds, lockGuild, onGuildChange]);

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  const validateChannelSelection = useCallback(
    async (nextChannelId: string, requestGuildId: string) => {
      if (!nextChannelId) {
        validatedChannelKeyRef.current = '';
        setChannelError(null);
        onChannelChange('');
        return;
      }
      const requestId = ++channelValidateRef.current;
      setValidatingChannel(true);
      setChannelError(null);
      try {
        const result = await validatePublishChannel(
          accessToken,
          requestGuildId,
          nextChannelId,
        );
        if (requestId !== channelValidateRef.current) return;
        if (!result.ok) {
          validatedChannelKeyRef.current = '';
          setChannelError(result.error ?? 'FORZA.EVENTS cannot post in this channel.');
          onChannelChange('');
          return;
        }
        validatedChannelKeyRef.current = `${requestGuildId}:${nextChannelId}`;
        onChannelChange(nextChannelId);
      } catch (e) {
        if (requestId !== channelValidateRef.current) return;
        validatedChannelKeyRef.current = '';
        setChannelError(e instanceof Error ? e.message : String(e));
        onChannelChange('');
      } finally {
        if (requestId === channelValidateRef.current) setValidatingChannel(false);
      }
    },
    [accessToken, onChannelChange],
  );

  useEffect(() => {
    if (!guildId || !channelId || lockChannel || loadingChannels) return;
    const key = `${guildId}:${channelId}`;
    if (validatedChannelKeyRef.current === key) return;
    void validateChannelSelection(channelId, guildId);
  }, [guildId, channelId, lockChannel, loadingChannels, validateChannelSelection]);

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
          size="toolbar"
          onClick={handleAddBot}
        >
          {guilds.length === 0 ? 'Add to server' : 'Add to another server'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="toolbar"
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
        <FieldLabel className="mb-1.5 block">Discord server</FieldLabel>
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
            <Select
              value={guildId}
              disabled={lockGuild}
              onChange={(e) => {
                channelValidateRef.current += 1;
                validatedChannelKeyRef.current = '';
                setChannelError(null);
                setChannelHint(null);
                const next = guildOptions.find((g) => g.id === e.target.value);
                onGuildChange(e.target.value, next?.name ?? '');
              }}
            >
              <option value="">Select a server</option>
              {guildOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
            {botInstallActions}
            {!lockGuild && (
              <p className="mt-1.5 text-[10px] leading-relaxed text-muted">
                Only servers where you manage the server and FORZA.EVENTS is installed are listed.
                Use Add to another server to install the bot elsewhere, then refresh.
                {installInBrowser &&
                  ' Install opens in your browser; return to the Activity when done.'}
              </p>
            )}
          </>
        )}
        {lockGuild && (
          <p className="mt-1 text-[10px] text-muted">Server is locked after publish.</p>
        )}
      </div>

      <div>
        <FieldLabel className="mb-1.5 block">Channel</FieldLabel>
        {!guildId ? (
          <p className="text-sm text-muted">Choose a server first.</p>
        ) : (
          <>
            <Select
              key={guildId}
              value={channelId}
              disabled={lockChannel || !guildId || loadingChannels || validatingChannel}
              className="disabled:opacity-60"
              onChange={(e) => {
                void validateChannelSelection(e.target.value, guildId);
              }}
            >
              <option value="">Select a channel</option>
              {channelOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name === 'selected-channel' ? 'Selected channel' : `#${c.name}`}
                </option>
              ))}
            </Select>
            {loadingChannels && (
              <p className="mt-1.5 text-[10px] text-muted">Refreshing channel list…</p>
            )}
            {validatingChannel && (
              <p className="mt-1.5 text-[10px] text-muted">Checking bot permissions…</p>
            )}
            {channelHint && !channelError && (
              <p className="mt-1.5 text-[10px] text-amber-200/90">{channelHint}</p>
            )}
            {channelError && (
              <p role="alert" className="mt-1.5 text-xs text-red-300/90">
                {channelError}
              </p>
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
          <TextButton
            type="button"
            onClick={() => {
              if (loadingGuilds || guilds.length === 0) loadGuilds();
              else loadChannels();
            }}
          >
            Try again
          </TextButton>
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
    <ModalBackdrop>
      <ModalPanel>
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
            {confirming ? BUSY_LABEL.publishing : 'Publish'}
          </Button>
        </div>
      </ModalPanel>
    </ModalBackdrop>
  );
}
