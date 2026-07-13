import {useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {busyLabel} from '../../../i18n/busyLabels';
import {changeGroupLeader} from '../../../lib/api';
import {track} from '../../../lib/analytics';
import {ApiRequestError} from '../../../lib/apiErrors';
import {buildChangeGroupLeaderCandidates, groupHasSeatForIncomingLeader} from '../../../lib/eventRoster';
import {Button} from '../../../components/ui/Button';
import {Alert} from '../../../components/ui/Alert';
import {ModalBackdrop, ModalPanel} from '../../../components/ui/ModalShell';
import {
  ConvoyLeaderPicker,
  type ConvoyLeaderSelection,
} from '../../../components/ConvoyLeaderPicker';
import type {ForzaEvent} from '../../../lib/types';
import type {EventParticipant} from '../../../lib/types';

type Props = {
  event: ForzaEvent;
  waitlist: EventParticipant[];
  groupIndex: number;
  accessToken: string;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
};

export function EventDetailChangeGroupLeader({
  event,
  waitlist,
  groupIndex,
  accessToken,
  open,
  onClose,
  onChanged,
}: Props) {
  const {t} = useTranslation();
  const [selected, setSelected] = useState<ConvoyLeaderSelection | null>(null);
  const [gamertag, setGamertag] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const candidates = useMemo(
    () => buildChangeGroupLeaderCandidates(event, waitlist, groupIndex),
    [event, waitlist, groupIndex],
  );

  const disableGuildSearch = useMemo(
    () => !groupHasSeatForIncomingLeader(event, groupIndex),
    [event, groupIndex],
  );

  const excludeDiscordIds = useMemo(() => {
    const ids = new Set(
      event.participants
        .filter((p) => p.isConvoyLeader && !p.waitlisted)
        .map((p) => p.discordId),
    );
    if (groupIndex === 1) {
      const denormId =
        event.lobbyLeaderIsHost === false
          ? event.lobbyLeaderDiscordId?.trim()
          : (event.lobbyLeaderDiscordId?.trim() || event.hostDiscordId);
      if (denormId) ids.add(denormId);
    }
    return [...ids];
  }, [event, groupIndex]);

  if (!open) return null;

  function handleClose() {
    if (busy) return;
    setSelected(null);
    setGamertag('');
    setError(null);
    onClose();
  }

  async function handleConfirm() {
    if (!selected) {
      setError(t('changeGroupLeader.pickLeader'));
      return;
    }
    const gt = selected.xboxGamertag?.trim() || gamertag.trim();
    if (!gt) {
      setError(t('changeGroupLeader.gamertagRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await changeGroupLeader(accessToken, event.id, groupIndex, {
        discordId: selected.discordId,
        gamertag: gt,
        username: selected.username,
      });
      track('change_group_leader', {
        outcome: 'success',
        event_id: event.id,
        meta: {group_index: groupIndex},
      });
      setSelected(null);
      setGamertag('');
      setError(null);
      onClose();
      onChanged();
    } catch (e) {
      setError(e instanceof ApiRequestError || e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalBackdrop onBackdropClick={busy ? undefined : handleClose}>
      <ModalPanel role="dialog" aria-modal="true" aria-labelledby="change-group-leader-title">
        <h2 id="change-group-leader-title" className="text-lg font-bold text-white">
          {t('changeGroupLeader.title', {n: groupIndex})}
        </h2>
        <p className="mt-2 text-sm text-muted">{t('changeGroupLeader.description')}</p>

        <ConvoyLeaderPicker
          accessToken={accessToken}
          guildId={event.guildId ?? ''}
          guildName={event.guildName}
          hostDiscordId={event.hostDiscordId}
          selected={selected}
          gamertag={gamertag}
          onSelect={setSelected}
          onGamertagChange={setGamertag}
          candidates={candidates}
          candidatesLabel={t('changeGroupLeader.leaderCandidates')}
          allowHostCandidate
          excludeDiscordIds={excludeDiscordIds}
          disableGuildSearch={disableGuildSearch}
        />

        {error ? (
          <Alert variant="warning" className="mt-3">
            {error}
          </Alert>
        ) : null}

        <div className="mt-5 flex gap-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            disabled={busy}
            onClick={handleClose}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            variant="primary"
            className="flex-1"
            disabled={busy || !selected}
            onClick={() => void handleConfirm()}
          >
            {busy ? busyLabel('working') : t('changeGroupLeader.confirm')}
          </Button>
        </div>
      </ModalPanel>
    </ModalBackdrop>
  );
}
