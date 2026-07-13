import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {busyLabel} from '../i18n/busyLabels';
import {listChannels, listGuilds} from '../lib/api';
import {track} from '../lib/analytics';
import {getGuildContext} from '../lib/discord';
import {buildBotInstallUrl, openBotInstallUrl} from '../lib/discordInstall';
import {isPlaceholderGuildName} from '../lib/guildDisplay';
import {Button} from './ui/Button';
import {FieldLabel} from './ui/FieldLabel';
import {Select} from './ui/Select';
import {ModalBackdrop, ModalPanel} from './ui/ModalShell';
import {TextButton} from './ui/TextButton';

/** Internal option name when channel list has not loaded yet but `channelId` is set. */
const SELECTED_CHANNEL_SENTINEL = '__forza_selected_channel__';

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
  const {t} = useTranslation();
  const [guilds, setGuilds] = useState<{id: string; name: string}[]>([]);
  const [channels, setChannels] = useState<{id: string; name: string}[]>([]);
  const [guildHint, setGuildHint] = useState<string | null>(null);
  const [loadingGuilds, setLoadingGuilds] = useState(true);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [channelHint, setChannelHint] = useState<string | null>(null);
  const [guildError, setGuildError] = useState<string | null>(null);
  const [channelsError, setChannelsError] = useState<string | null>(null);
  const guildRequestRef = useRef(0);
  const channelRequestRef = useRef(0);
  const guildIdRef = useRef(guildId);
  const channelIdRef = useRef(channelId);
  const onGuildChangeRef = useRef(onGuildChange);
  const autoSelectAttemptedRef = useRef(false);
  const channelsGuildRef = useRef<string | null>(null);
  const guildNameSyncedRef = useRef<string | null>(null);
  const emptyGuildTrackedRef = useRef(false);
  guildIdRef.current = guildId;
  channelIdRef.current = channelId;
  onGuildChangeRef.current = onGuildChange;
  const canAddBot = Boolean(buildBotInstallUrl());
  const activityGuildId = getGuildContext().guildId;

  const guildOptions = useMemo(() => {
    if (guildId && guildName && !guilds.some((g) => g.id === guildId)) {
      return [{id: guildId, name: guildName}, ...guilds];
    }
    return guilds;
  }, [guilds, guildId, guildName]);

  const channelOptions = useMemo(() => {
    if (channelId && !channels.some((c) => c.id === channelId)) {
      return [{id: channelId, name: SELECTED_CHANNEL_SENTINEL}, ...channels];
    }
    return channels;
  }, [channels, channelId]);

  const loadGuilds = useCallback((options?: {background?: boolean; fresh?: boolean}) => {
    const requestId = ++guildRequestRef.current;
    if (!options?.background) setLoadingGuilds(true);
    setGuildError(null);
    void listGuilds(accessToken, {fresh: options?.fresh})
      .then((r) => {
        if (requestId !== guildRequestRef.current) return;
        setGuilds(r.guilds);
        setGuildHint(r.hint ?? null);
        if (r.guilds.length === 0 && !emptyGuildTrackedRef.current) {
          emptyGuildTrackedRef.current = true;
          track('empty_guild_list', {meta: {has_hint: Boolean(r.hint)}});
        }
        if (
          !lockGuild &&
          !guildIdRef.current &&
          !autoSelectAttemptedRef.current
        ) {
          const preferred =
            (activityGuildId
              ? r.guilds.find((g) => g.id === activityGuildId)
              : undefined) ?? (r.guilds.length === 1 ? r.guilds[0] : undefined);
          if (preferred) {
            autoSelectAttemptedRef.current = true;
            onGuildChangeRef.current(preferred.id, preferred.name);
          }
        }
      })
      .catch((e) => {
        if (requestId !== guildRequestRef.current) return;
        setGuildError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (requestId === guildRequestRef.current) setLoadingGuilds(false);
      });
  }, [accessToken, activityGuildId, lockGuild]);

  const loadChannels = useCallback((options?: {background?: boolean; fresh?: boolean}) => {
    if (!guildId) {
      channelRequestRef.current += 1;
      channelsGuildRef.current = null;
      setChannels([]);
      setLoadingChannels(false);
      return;
    }
    const requestGuildId = guildId;
    const guildChanged = channelsGuildRef.current !== requestGuildId;
    channelsGuildRef.current = requestGuildId;
    const requestId = ++channelRequestRef.current;
    if (guildChanged) {
      setChannels([]);
      setChannelHint(null);
      setChannelsError(null);
    }
    if (!options?.background || guildChanged) setLoadingChannels(true);
    void listChannels(accessToken, requestGuildId, {fresh: options?.fresh})
      .then((r) => {
        if (requestId !== channelRequestRef.current) return;
        setChannels(r.channels);
        setChannelHint(r.hint ?? null);
        const savedChannelId = channelIdRef.current;
        if (
          !lockChannel &&
          savedChannelId &&
          !r.channels.some((c) => c.id === savedChannelId)
        ) {
          onChannelChange('');
        }
      })
      .catch((e) => {
        if (requestId !== channelRequestRef.current) return;
        setChannelsError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (requestId === channelRequestRef.current) setLoadingChannels(false);
      });
  }, [accessToken, guildId, lockChannel, onChannelChange]);

  useEffect(() => {
    loadGuilds();
  }, [accessToken, loadGuilds]);

  useEffect(() => {
    if (!guildId || lockGuild || guilds.length === 0) return;
    const match = guilds.find((g) => g.id === guildId);
    if (!match) return;
    const syncKey = `${guildId}:${match.name}`;
    if (guildNameSyncedRef.current === syncKey) return;
    if (isPlaceholderGuildName(guildName) || guildName !== match.name) {
      guildNameSyncedRef.current = syncKey;
      onGuildChangeRef.current(guildId, match.name);
    }
  }, [guildId, guildName, guilds, lockGuild]);

  useEffect(() => {
    if (!guildId || loadingGuilds) return;
    loadChannels();
  }, [guildId, loadingGuilds, loadChannels]);

  function handleAddBot() {
    track('bot_install_click', {
      meta: {empty_guild_list: guilds.length === 0},
    });
    const prefillCurrentServer =
      guilds.length === 0 && activityGuildId ? {guildId: activityGuildId} : undefined;
    void openBotInstallUrl(prefillCurrentServer);
  }

  const botInstallActions =
    canAddBot && !lockGuild ? (
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="toolbar"
          className={
            guilds.length === 0
              ? 'border-accent-purple/35 text-accent-purple-light hover:border-accent-purple/50'
              : undefined
          }
          onClick={handleAddBot}
        >
          {guilds.length === 0 ? 'Add to server' : 'Add to another server'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="toolbar"
          onClick={() => loadGuilds({background: true, fresh: true})}
          disabled={loadingGuilds}
        >
          {t('publish.refreshList')}
        </Button>
      </div>
    ) : (
      <div className="mt-2">
        <Button
          type="button"
          variant="ghost"
          size="toolbar"
          onClick={() => loadGuilds({background: true, fresh: true})}
          disabled={loadingGuilds}
        >
          {t('publish.refreshList')}
        </Button>
      </div>
    );

  const channelSelectDisabled =
    lockChannel ||
    !guildId ||
    (loadingChannels && channels.length === 0);
  const channelPlaceholderKey = !guildId
    ? 'publish.selectServerFirst'
    : loadingChannels && channels.length === 0
      ? 'publish.refreshingChannels'
      : 'publish.selectChannel';

  const channelRefreshActions = guildId ? (
    <div className="mt-2">
      <Button
        type="button"
        variant="ghost"
        size="toolbar"
        onClick={() => loadChannels({background: true, fresh: true})}
        disabled={loadingChannels}
      >
        {t('publish.refreshChannels')}
      </Button>
    </div>
  ) : null;

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel className="mb-1.5 block">{t('publish.discordServer')}</FieldLabel>
        {loadingGuilds && guilds.length === 0 ? (
          <Select disabled value="" aria-busy>
            <option value="">{t('loading.servers')}</option>
          </Select>
        ) : guilds.length === 0 && !loadingGuilds ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">
              {guildHint ?? t('publish.noServersHint')}
            </p>
            {botInstallActions}
          </div>
        ) : (
          <>
            <Select
              value={guildId}
              disabled={lockGuild}
              onChange={(e) => {
                guildNameSyncedRef.current = null;
                const next = guildOptions.find((g) => g.id === e.target.value);
                onGuildChange(e.target.value, next?.name ?? '');
              }}
            >
              <option value="">{t('publish.selectServer')}</option>
              {guildOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
            {botInstallActions}
          </>
        )}
        {lockGuild && (
          <p className="mt-1.5 text-xs text-muted">{t('create.serverLocked')}</p>
        )}
      </div>

      <div>
        <FieldLabel className="mb-1.5 block">{t('publish.announcementChannel')}</FieldLabel>
        <Select
          value={guildId ? channelId : ''}
          disabled={channelSelectDisabled}
          aria-busy={loadingChannels && channels.length === 0}
          className="disabled:opacity-60"
          onChange={(e) => {
            if (!guildId) return;
            onChannelChange(e.target.value);
          }}
        >
          <option value="">{t(channelPlaceholderKey)}</option>
          {guildId &&
            !(loadingChannels && channels.length === 0) &&
            channelOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name === SELECTED_CHANNEL_SENTINEL
                  ? t('create.selectedChannel')
                  : `#${c.name}`}
              </option>
            ))}
        </Select>
        {channelRefreshActions}
        {channelsError && (
          <div className="mt-2 space-y-2">
            <p role="alert" className="text-xs text-accent-red">
              {channelsError}
            </p>
            <TextButton
              type="button"
              onClick={() => loadChannels({background: true, fresh: true})}
              disabled={loadingChannels}
            >
              {t('common.tryAgain')}
            </TextButton>
          </div>
        )}
        {channelHint && !channelsError && (
          <p className="mt-1.5 text-[10px] text-amber-200/90">{channelHint}</p>
        )}
        {lockChannel && (
          <p className="mt-1.5 text-xs text-muted">{t('create.channelLocked')}</p>
        )}
      </div>

      {guildError && (
        <div className="space-y-2">
          <p className="text-xs text-accent-red">{guildError}</p>
          <TextButton type="button" onClick={() => loadGuilds({background: true, fresh: true})} disabled={loadingGuilds}>
            {t('common.tryAgain')}
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
  const {t} = useTranslation();

  return (
    <ModalBackdrop>
      <ModalPanel>
        <h2 className="text-lg font-bold text-white">{t('publish.choosePublishTarget')}</h2>
        <p className="mt-1 text-sm text-muted">{t('publish.modalHint')}</p>
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
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            variant="primary"
            emphasis="solid"
            className="flex-1"
            disabled={!guildId || !channelId || confirming}
            onClick={onConfirm}
          >
            {confirming ? busyLabel('publishing') : t('create.publish')}
          </Button>
        </div>
      </ModalPanel>
    </ModalBackdrop>
  );
}
