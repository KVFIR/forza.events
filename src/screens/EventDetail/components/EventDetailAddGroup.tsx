import {useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {busyLabel} from '../../../i18n/busyLabels';
import {addGroup} from '../../../lib/api';
import {ApiRequestError} from '../../../lib/apiErrors';
import {buildAddGroupLeaderCandidates} from '../../../lib/eventRoster';
import {Button} from '../../../components/ui/Button';
import {Alert} from '../../../components/ui/Alert';
import {ModalBackdrop, ModalPanel} from '../../../components/ui/ModalShell';
import {
  ConvoyLeaderPicker,
  type ConvoyLeaderSelection,
} from '../../../components/ConvoyLeaderPicker';
import type {EventDetailViewModel} from '../eventDetailView';
import type {ForzaEvent} from '../../../lib/types';

type Props = {
  event: ForzaEvent;
  view: Pick<EventDetailViewModel, 'canAddGroup' | 'waitlist' | 'ev'>;
  accessToken: string | null;
  onAdded: () => void;
};

export function EventDetailAddGroup({event, view, accessToken, onAdded}: Props) {
  const {t} = useTranslation();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ConvoyLeaderSelection | null>(null);
  const [gamertag, setGamertag] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const candidates = useMemo(
    () => buildAddGroupLeaderCandidates(event, view.waitlist),
    [event, view.waitlist],
  );

  const excludeDiscordIds = useMemo(
    () =>
      event.participants
        .filter((p) => p.isConvoyLeader && !p.waitlisted)
        .map((p) => p.discordId),
    [event.participants],
  );

  if (!view.canAddGroup || !accessToken) return null;

  const nextGroup = (event.groupCount ?? 1) + 1;

  function close() {
    setOpen(false);
    setSelected(null);
    setGamertag('');
    setError(null);
  }

  async function handleConfirm() {
    if (!accessToken) return;
    if (!selected) {
      setError(t('addGroup.pickLeader'));
      return;
    }
    const gt = (selected.xboxGamertag?.trim() || gamertag.trim());
    if (!gt) {
      setError(t('addGroup.gamertagRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await addGroup(accessToken, event.id, {
        discordId: selected.discordId,
        gamertag: gt,
        username: selected.username,
      });
      close();
      onAdded();
    } catch (e) {
      setError(e instanceof ApiRequestError || e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4">
      <Button
        variant="secondary"
        size="toolbar"
        className="whitespace-nowrap"
        onClick={() => setOpen(true)}
      >
        {t('addGroup.button', {n: nextGroup})}
      </Button>

      {open ? (
        <ModalBackdrop onBackdropClick={busy ? undefined : close}>
          <ModalPanel role="dialog" aria-modal="true" aria-labelledby="add-group-title">
            <h2 id="add-group-title" className="text-lg font-bold text-white">
              {t('addGroup.title', {n: nextGroup})}
            </h2>
            <p className="mt-2 text-sm text-muted">{t('addGroup.description')}</p>

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
              candidatesLabel={t('addGroup.leaderCandidates')}
              allowHostCandidate
              excludeDiscordIds={excludeDiscordIds}
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
                onClick={close}
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
                {busy ? busyLabel('working') : t('addGroup.confirm')}
              </Button>
            </div>
          </ModalPanel>
        </ModalBackdrop>
      ) : null}
    </div>
  );
}
