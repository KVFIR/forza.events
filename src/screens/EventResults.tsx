import {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {busyLabel} from '../i18n/busyLabels';
import {useNavigate, useParams} from 'react-router-dom';
import {ArrowLeft, ChevronDown, ChevronUp} from 'lucide-react';
import {useAuth} from '../context/AuthContext';
import {useJoinedEvents} from '../context/JoinedEventsContext';
import {isApiConfigured, submitEventResults} from '../lib/api';
import {buildResultSubmitRows} from '../lib/eventResults';
import {resolveResultsRoster} from '../lib/eventRoster';
import {
  canSubmitEventResults,
  eventHasStarted,
  fetchEventById,
  fetchEventResults,
} from '../lib/events';
import type {EventParticipant} from '../lib/types';
import {Alert} from '../components/ui/Alert';
import {Button} from '../components/ui/Button';
import {CheckboxField} from '../components/ui/CheckboxField';
import {Panel} from '../components/ui/Panel';
import {TextLink} from '../components/ui/TextButton';
import {ConfirmDialog} from '../components/ui/ConfirmDialog';
import {ContentReveal} from '../components/ui/ContentReveal';
import {PageLoading} from '../components/ui/PageLoading';
import {useLoadingUI} from '../hooks/useLoadingUI';
import {cn} from '../lib/cn';

type Placement = {
  discordId: string;
  label: string;
  dnf: boolean;
  dns: boolean;
};

function participantLabel(p: EventParticipant): string {
  return p.gamertag ?? p.username;
}

function buildPlacements(participants: EventParticipant[]): Placement[] {
  return participants.map((p) => ({
    discordId: p.discordId,
    label: participantLabel(p),
    dnf: false,
    dns: false,
  }));
}

export function EventResults() {
  const {t} = useTranslation();
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const {user, getAccessToken, isSignedIn} = useAuth();
  const {bumpRefresh} = useJoinedEvents();
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [loading, setLoading] = useState(true);
  const showLoadingUI = useLoadingUI(loading);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    void Promise.all([fetchEventById(id), fetchEventResults(id)])
      .then(([event, saved]) => {
        if (cancelled || !event) return;
        setTitle(event.title);
        if (!canSubmitEventResults(event, user)) {
          navigate(`/event/${id}`, {replace: true});
          return;
        }
        if (!eventHasStarted(event)) {
          navigate(`/event/${id}`, {replace: true});
          return;
        }
        if (saved.length > 0) {
          setAlreadySubmitted(true);
          navigate(`/event/${id}`, {replace: true});
          return;
        }
        setPlacements(
          buildPlacements(
            resolveResultsRoster(event, user.discordId, user.xboxGamertag),
          ),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, user, navigate]);

  function move(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= placements.length) return;
    setPlacements((list) => {
      const copy = [...list];
      [copy[index], copy[next]] = [copy[next], copy[index]];
      return copy;
    });
  }

  function toggleDnf(index: number) {
    setPlacements((list) =>
      list.map((row, i) =>
        i === index ? {...row, dnf: !row.dnf, dns: false} : row,
      ),
    );
  }

  function toggleDns(index: number) {
    setPlacements((list) =>
      list.map((row, i) =>
        i === index ? {...row, dns: !row.dns, dnf: false} : row,
      ),
    );
  }

  async function handleSubmit() {
    if (!id || placements.length === 0 || alreadySubmitted) return;
    setSaving(true);
    setError(null);

    try {
      const token = getAccessToken();
      if (!isSignedIn || !token) {
        throw new Error('Sign in with Discord to submit results.');
      }
      if (!isApiConfigured()) {
        throw new Error('App is not configured for saving results.');
      }

      const fresh = await fetchEventById(id, {discordToken: token});
      if (!fresh) {
        throw new Error('Event not found.');
      }
      const allowedIds = new Set(
        resolveResultsRoster(fresh, user.discordId, user.xboxGamertag).map((p) => p.discordId),
      );
      const payload = buildResultSubmitRows(
        placements.filter((p) => allowedIds.has(p.discordId)),
      );

      if (payload.length === 0) {
        throw new Error(t('results.noParticipants'));
      }

      await submitEventResults(token, id, payload);
      bumpRefresh();
      navigate(`/event/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (showLoadingUI) {
    return <PageLoading label={t('loading.results')} className="pb-10 pt-5" />;
  }

  if (loading) {
    return null;
  }

  return (
    <ContentReveal className="pb-10 pt-5">
      <TextLink
        to={id ? `/event/${id}` : '/'}
        tone="nav"
        className="mb-5 inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('common.back')}
      </TextLink>

      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs text-muted">
        Set finishing order. Mark DNF or DNS (host no-show) where needed. Results cannot be changed after submit.
      </p>

      {error && (
        <Alert variant="info" className="mt-4">
          {error}
        </Alert>
      )}

      <ol className="mt-5 space-y-2">
        {placements.map((row, index) => {
          const finisherIndex = placements
            .slice(0, index + 1)
            .filter((p) => !p.dnf && !p.dns).length;
          const positionLabel = row.dns
            ? t('results.dns')
            : row.dnf
              ? t('results.dnf')
              : String(finisherIndex);

          return (
          <li key={row.discordId}>
            <Panel variant="soft" className="flex items-center gap-2 px-3 py-2.5">
            <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-muted">
              {positionLabel}
            </span>
            <span
              className={cn(
                'min-w-0 flex-1 truncate text-sm',
                (row.dnf || row.dns) && 'text-muted line-through',
              )}
            >
              {row.label}
            </span>
            <CheckboxField
              label={t('results.dnf')}
              checked={row.dnf}
              onChange={() => toggleDnf(index)}
            />
            <CheckboxField
              label={t('results.dns')}
              checked={row.dns}
              onChange={() => toggleDns(index)}
            />
            <div className="flex shrink-0 flex-col">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="p-0.5 text-muted hover:text-white disabled:opacity-30"
                disabled={index === 0}
                onClick={() => move(index, -1)}
                aria-label={t('results.moveUp')}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="p-0.5 text-muted hover:text-white disabled:opacity-30"
                disabled={index === placements.length - 1}
                onClick={() => move(index, 1)}
                aria-label={t('results.moveDown')}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
            </Panel>
          </li>
          );
        })}
      </ol>

      {placements.length === 0 && (
        <p className="mt-8 text-center text-sm text-muted">{t('results.noParticipants')}</p>
      )}

      <Button
        variant="primary"
        fullWidth
        className="mt-8"
        disabled={saving || placements.length === 0 || alreadySubmitted}
        onClick={() => setSubmitConfirmOpen(true)}
      >
        {saving ? busyLabel('saving') : t('eventDetail.submitResults')}
      </Button>

      <ConfirmDialog
        open={submitConfirmOpen}
        title={t('results.submitTitle')}
        description={t('results.submitDesc')}
        confirmLabel={t('eventDetail.submitResults')}
        busy={saving}
        onCancel={() => setSubmitConfirmOpen(false)}
        onConfirm={() => {
          setSubmitConfirmOpen(false);
          void handleSubmit();
        }}
      />
    </ContentReveal>
  );
}
