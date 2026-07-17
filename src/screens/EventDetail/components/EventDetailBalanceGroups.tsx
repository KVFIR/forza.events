import {useMemo, useState, type ReactNode} from 'react';
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
  canBalanceShuffle: boolean;
  onBalanced: () => void;
  children: (parts: {trigger: ReactNode; error: ReactNode | null}) => ReactNode;
};

type RosterChoice = {
  mode: GroupRosterMode;
  title: string;
  hint: string;
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

function rosterAnalyticsName(mode: GroupRosterMode): string {
  if (mode === 'shuffle') return 'shuffle_groups';
  if (mode === 'balance_shuffle') return 'balance_shuffle_groups';
  return 'balance_groups';
}

export function EventDetailBalanceGroups({
  event,
  accessToken,
  canBalance,
  canShuffle,
  canBalanceShuffle,
  onBalanced,
  children,
}: Props) {
  const {t} = useTranslation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unchanged, setUnchanged] = useState(false);
  const [unchangedMode, setUnchangedMode] = useState<GroupRosterMode | null>(null);

  const choices = useMemo((): RosterChoice[] => {
    const list: RosterChoice[] = [];
    if (canBalanceShuffle) {
      list.push({
        mode: 'balance_shuffle',
        title: t('groupRoster.balanceShuffle'),
        hint: t('groupRoster.balanceShuffleHint'),
      });
    }
    if (canBalance) {
      list.push({
        mode: 'balance',
        title: t('groupRoster.balance'),
        hint: t('groupRoster.balanceHint'),
      });
    }
    if (canShuffle) {
      list.push({
        mode: 'shuffle',
        title: t('groupRoster.shuffle'),
        hint: t('groupRoster.shuffleHint'),
      });
    }
    return list;
  }, [canBalance, canBalanceShuffle, canShuffle, t]);

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
        track(rosterAnalyticsName(mode), {
          outcome: 'unchanged',
          event_id: event.id,
        });
        return;
      }
      track(rosterAnalyticsName(mode), {
        outcome: 'success',
        event_id: event.id,
        meta: {moved: movedCount},
      });
      setOpen(false);
      onBalanced();
    } catch (e) {
      const message = e instanceof ApiRequestError || e instanceof Error ? e.message : String(e);
      setError(message);
      track(rosterAnalyticsName(mode), {
        outcome: 'error',
        event_id: event.id,
        api_code: e instanceof ApiRequestError ? e.code : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  function modalTitle(): string {
    const only = choices.length === 1 ? choices[0] : null;
    if (!only) return t('groupRoster.titleChoose');
    if (only.mode === 'balance') return t('groupRoster.titleBalance');
    if (only.mode === 'balance_shuffle') return t('groupRoster.titleBalanceShuffle');
    return t('groupRoster.titleShuffle');
  }

  function modalIntro(): string {
    const only = choices.length === 1 ? choices[0] : null;
    if (!only) return t('groupRoster.introUneven');
    if (only.mode === 'balance') return t('groupRoster.introBalance');
    if (only.mode === 'balance_shuffle') return t('groupRoster.introBalanceShuffle');
    return t('groupRoster.introShuffle');
  }

  function unchangedMessage(mode: GroupRosterMode | null): string {
    if (mode === 'shuffle' || mode === 'balance_shuffle') {
      return t('groupRoster.shuffleUnchanged');
    }
    return t('groupRoster.unchanged');
  }

  function openModal() {
    if (busy || choices.length === 0) return;
    setError(null);
    setUnchanged(false);
    setUnchangedMode(null);
    setOpen(true);
  }

  const trigger =
    choices.length > 0 ? (
      <TextButton
        type="button"
        tone="action"
        className="shrink-0"
        disabled={busy}
        onClick={openModal}
      >
        {busy ? busyLabel('working') : t('groupRoster.action')}
      </TextButton>
    ) : (
      <span
        className="inline-flex shrink-0"
        title={t('groupRoster.unavailableTip')}
      >
        <TextButton
          type="button"
          tone="subtle"
          className="cursor-not-allowed opacity-50"
          disabled
          aria-disabled="true"
        >
          {t('groupRoster.action')}
        </TextButton>
      </span>
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
                {unchangedMessage(unchangedMode)}
              </Alert>
            ) : null}

            {choices.length > 0 ? (
              <div className="mt-4 space-y-2">
                {choices.map((choice) => (
                  <ChoiceRow
                    key={choice.mode}
                    title={choice.title}
                    hint={choice.hint}
                    disabled={busy}
                    onClick={() => void run(choice.mode)}
                  />
                ))}
              </div>
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
