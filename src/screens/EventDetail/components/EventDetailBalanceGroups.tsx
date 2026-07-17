import {useState, type ReactNode} from 'react';
import {useTranslation} from 'react-i18next';
import {balanceGroups, type GroupRosterMode} from '../../../lib/api';
import {track} from '../../../lib/analytics';
import {busyLabel} from '../../../i18n/busyLabels';
import {ApiRequestError} from '../../../lib/apiErrors';
import {cn} from '../../../lib/cn';
import {Alert} from '../../../components/ui/Alert';
import {Button} from '../../../components/ui/Button';
import {TextButton} from '../../../components/ui/TextButton';
import {ModalBackdrop, ModalPanel} from '../../../components/ui/ModalShell';
import type {ForzaEvent} from '../../../lib/types';

type Props = {
  event: ForzaEvent;
  accessToken: string;
  canBalance: boolean;
  canShuffle: boolean;
  onBalanced: () => void;
  children: (parts: {trigger: ReactNode; error: ReactNode | null}) => ReactNode;
};

function ChoiceRow({
  title,
  hint,
  disabled,
  onClick,
}: {
  title: string;
  hint: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left transition-colors',
        disabled ? 'cursor-not-allowed opacity-50' : 'hover:border-white/20 hover:bg-white/10',
      )}
    >
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted">{hint}</p>
    </button>
  );
}

export function EventDetailBalanceGroups({
  event,
  accessToken,
  canBalance,
  canShuffle,
  onBalanced,
  children,
}: Props) {
  const {t} = useTranslation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unchanged, setUnchanged] = useState(false);
  const [unchangedMode, setUnchangedMode] = useState<GroupRosterMode | null>(null);

  const dualChoice = canBalance && canShuffle;
  const singleMode: GroupRosterMode | null = dualChoice
    ? null
    : canBalance
      ? 'balance'
      : canShuffle
        ? 'shuffle'
        : null;

  async function run(mode: GroupRosterMode) {
    setBusy(true);
    setError(null);
    setUnchanged(false);
    setUnchangedMode(null);
    try {
      const result = await balanceGroups(accessToken, event.id, mode);
      const movedCount = result.moved?.length ?? 0;
      if (result.unchanged || movedCount === 0) {
        setUnchanged(true);
        setUnchangedMode(mode);
        track(mode === 'shuffle' ? 'shuffle_groups' : 'balance_groups', {
          outcome: 'unchanged',
          event_id: event.id,
        });
        return;
      }
      track(mode === 'shuffle' ? 'shuffle_groups' : 'balance_groups', {
        outcome: 'success',
        event_id: event.id,
        meta: {moved: movedCount},
      });
      setOpen(false);
      onBalanced();
    } catch (e) {
      const message = e instanceof ApiRequestError || e instanceof Error ? e.message : String(e);
      setError(message);
      track(mode === 'shuffle' ? 'shuffle_groups' : 'balance_groups', {
        outcome: 'error',
        event_id: event.id,
        api_code: e instanceof ApiRequestError ? e.code : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  function modalTitle(): string {
    if (dualChoice) return t('groupRoster.titleChoose');
    if (singleMode === 'balance') return t('groupRoster.titleBalance');
    return t('groupRoster.titleShuffle');
  }

  function modalIntro(): string {
    if (dualChoice) return t('groupRoster.introUneven');
    if (singleMode === 'balance') return t('groupRoster.introBalance');
    return t('groupRoster.introShuffle');
  }

  function openModal() {
    if (busy) return;
    setError(null);
    setUnchanged(false);
    setUnchangedMode(null);
    setOpen(true);
  }

  const trigger = (
    <TextButton
      type="button"
      tone="action"
      className="shrink-0"
      disabled={busy}
      onClick={openModal}
    >
      {busy ? busyLabel('working') : t('groupRoster.action')}
    </TextButton>
  );

  const errorNode = error && !open ? (
    <Alert variant="warning" className="mt-2">
      {error}
    </Alert>
  ) : null;

  return (
    <>
      {children({trigger, error: errorNode})}
      {open ? (
        <ModalBackdrop onBackdropClick={busy ? undefined : () => setOpen(false)}>
          <ModalPanel role="dialog" aria-modal="true" aria-labelledby="group-roster-title">
            <h2 id="group-roster-title" className="text-lg font-bold text-white">
              {modalTitle()}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {modalIntro()} {t('groupRoster.notifyWarning')}
            </p>

            {error ? (
              <Alert variant="warning" className="mt-3">
                {error}
              </Alert>
            ) : null}

            {unchanged ? (
              <Alert variant="info" className="mt-3">
                {unchangedMode === 'shuffle'
                  ? t('groupRoster.shuffleUnchanged')
                  : t('groupRoster.unchanged')}
              </Alert>
            ) : null}

            {dualChoice ? (
              <div className="mt-4 space-y-2">
                {canBalance ? (
                  <ChoiceRow
                    title={t('groupRoster.balance')}
                    hint={t('groupRoster.balanceHint')}
                    disabled={busy}
                    onClick={() => void run('balance')}
                  />
                ) : null}
                {canShuffle ? (
                  <ChoiceRow
                    title={t('groupRoster.shuffle')}
                    hint={t('groupRoster.shuffleHint')}
                    disabled={busy}
                    onClick={() => void run('shuffle')}
                  />
                ) : null}
              </div>
            ) : singleMode ? (
              <Button
                type="button"
                className="mt-4 w-full"
                emphasis="solid"
                disabled={busy}
                onClick={() => void run(singleMode)}
              >
                {busy
                  ? busyLabel('working')
                  : singleMode === 'balance'
                    ? t('groupRoster.confirmBalance')
                    : t('groupRoster.confirmShuffle')}
              </Button>
            ) : null}

            <Button
              type="button"
              variant="secondary"
              className="mt-2 w-full"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              {t('common.cancel')}
            </Button>
          </ModalPanel>
        </ModalBackdrop>
      ) : null}
    </>
  );
}
