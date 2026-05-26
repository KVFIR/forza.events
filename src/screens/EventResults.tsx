import {useEffect, useState} from 'react';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {ArrowLeft, ChevronDown, ChevronUp} from 'lucide-react';
import {useAuth} from '../context/AuthContext';
import {useJoinedEvents} from '../context/JoinedEventsContext';
import {isApiConfigured, submitEventResults} from '../lib/api';
import {
  canSubmitEventResults,
  eventHasStarted,
  fetchEventById,
  fetchEventResults,
} from '../lib/events';
import type {EventParticipant} from '../lib/types';
import {Button} from '../components/ui/Button';
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
        const base =
          event.participants.length > 0
            ? event.participants
            : [
                {
                  discordId: user.discordId,
                  username: user.username,
                  gamertag: user.xboxGamertag,
                },
              ];
        setPlacements(buildPlacements(base));
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
    const payload = placements.map((p, i) => ({
      discord_id: p.discordId,
      position: i + 1,
      dnf: p.dnf,
      dns: p.dns,
    }));

    try {
      const token = getAccessToken();
      if (isSignedIn && isApiConfigured() && token) {
        await submitEventResults(token, id, payload);
      }
      bumpRefresh();
      navigate(`/event/${id}`);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  if (showLoadingUI) {
    return <PageLoading label="Loading results" className="pb-10 pt-5" />;
  }

  if (loading) {
    return null;
  }

  return (
    <ContentReveal className="pb-10 pt-5">
      <Link
        to={id ? `/event/${id}` : '/'}
        className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted hover:text-accent-purple-light transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </Link>

      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs text-muted">
        Set finishing order. Mark DNF or DNS (host no-show) where needed. Results cannot be changed after submit.
      </p>

      {error && (
        <p className="mt-4 rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-xs text-slate-300">
          {error}
        </p>
      )}

      <ol className="mt-5 space-y-2">
        {placements.map((row, index) => (
          <li
            key={row.discordId}
            className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-card px-3 py-2.5"
          >
            <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-muted">
              {index + 1}
            </span>
            <span
              className={cn(
                'min-w-0 flex-1 truncate text-sm',
                (row.dnf || row.dns) && 'text-muted line-through',
              )}
            >
              {row.label}
            </span>
            <label className="flex shrink-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted">
              <input
                type="checkbox"
                checked={row.dnf}
                onChange={() => toggleDnf(index)}
                className="rounded border-white/20 bg-white/[0.05]"
              />
              DNF
            </label>
            <label className="flex shrink-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted">
              <input
                type="checkbox"
                checked={row.dns}
                onChange={() => toggleDns(index)}
                className="rounded border-white/20 bg-white/[0.05]"
              />
              DNS
            </label>
            <div className="flex shrink-0 flex-col">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => move(index, -1)}
                className="rounded p-0.5 text-muted hover:text-white disabled:opacity-30"
                aria-label="Move up"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={index === placements.length - 1}
                onClick={() => move(index, 1)}
                className="rounded p-0.5 text-muted hover:text-white disabled:opacity-30"
                aria-label="Move down"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ol>

      {placements.length === 0 && (
        <p className="mt-8 text-center text-sm text-muted">No participants to rank yet.</p>
      )}

      <Button
        variant="primary"
        className="mt-8 w-full"
        disabled={saving || placements.length === 0 || alreadySubmitted}
        onClick={() => void handleSubmit()}
      >
        {saving ? 'Saving…' : 'Submit results'}
      </Button>
    </ContentReveal>
  );
}
