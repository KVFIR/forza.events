import {useCallback, useEffect, useRef, useState} from 'react';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Users,
  Car,
  Shield,
  Wrench,
} from 'lucide-react';
import {EventCover} from '../components/EventCover';
import {defaultCoverPath} from '../lib/eventCovers';
import {RoadIcon} from '../components/icons/RoadIcon';
import type {ForzaEvent} from '../lib/types';
import {
  canSubmitEventResults,
  fetchEventById,
  fetchEventResults,
  isEventCompleted,
  resolveEventResultDisplay,
  type EventResultRow,
} from '../lib/events';
import {EventResultsTable} from '../components/EventResultsTable';
import {ContentReveal} from '../components/ui/ContentReveal';
import {PageLoading} from '../components/ui/PageLoading';
import {useLoadingUI} from '../hooks/useLoadingUI';
import {formatEventTime} from '../lib/datetime';
import {cancelEvent, deleteDraftEvent, isApiConfigured, updateProfile} from '../lib/api';
import {
  canCancelEvent,
  canDeleteDraft,
  canEditEvent,
  eventHasStarted,
  isEventFinalized,
  isPublishedToDiscord,
  isRegistrationOpen,
} from '../lib/eventSpec';
import {EventStatusBanner} from '../components/EventStatusBanner';
import {Badge, DraftBadge, StatusBadge} from '../components/ui/Badge';
import {Button} from '../components/ui/Button';
import {ConfirmDialog} from '../components/ui/ConfirmDialog';
import {GamertagModal} from '../components/GamertagModal';
import {useJoinedEvents} from '../context/JoinedEventsContext';
import {useAuth} from '../context/AuthContext';
import {useEventLiveUpdates} from '../hooks/useEventLiveUpdates';
import {piToClass} from '../lib/pi';
import {formatLobbyCount, LOBBY_TOTAL_PLAYERS} from '../lib/constants';
import {resolveOrganiserLabel} from '../lib/organiser';
import {participationButtonLabel, participationButtonVariant} from '../lib/eventActions';
import {cn} from '../lib/cn';

const piClassColor: Record<string, string> = {
  D: 'text-slate-400',
  C: 'text-yellow-400/90',
  B: 'text-orange-400/90',
  A: 'text-red-400/90',
  S1: 'text-violet-400/90',
  S2: 'text-fuchsia-400/90',
  R: 'text-amber-400/90',
};

const carRuleRowClass =
  'grid grid-cols-[minmax(0,1fr)_3.5rem] items-center gap-x-3 text-sm leading-tight';

export function EventDetail() {
  const navigate = useNavigate();
  const {id} = useParams<{id: string}>();
  const [event, setEvent] = useState<ForzaEvent | undefined>();
  const [resultRows, setResultRows] = useState<EventResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const loadedForIdRef = useRef<string | null>(null);
  const showLoadingUI = useLoadingUI(loading && !event);
  const {isJoined, toggleJoin, bumpRefresh, refreshKey} = useJoinedEvents();
  const {user, refreshUser, getAccessToken, isSignedIn} = useAuth();
  const discordToken = getAccessToken();
  const [gamertagOpen, setGamertagOpen] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'delete' | 'cancel' | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const reloadEvent = useCallback(() => {
    if (!id) return;
    void fetchEventById(id, {discordToken}).then(setEvent);
  }, [id, discordToken]);

  useEventLiveUpdates(id, reloadEvent);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const isInitial = loadedForIdRef.current !== id;

    if (isInitial) {
      loadedForIdRef.current = id;
      setLoading(true);
      setEvent(undefined);
      setResultRows([]);
    }

    void fetchEventById(id, {discordToken})
      .then(async (ev) => {
        if (cancelled) return;
        setEvent(ev);
        if (ev && isEventCompleted(ev)) {
          setResultRows(await fetchEventResults(id));
        } else {
          setResultRows([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, refreshKey, discordToken]);

  async function handleJoinClick() {
    if (!event) return;
    if (isJoined(event)) {
      await toggleJoin(event);
      const next = await fetchEventById(event.id, {discordToken});
      setEvent(next);
      return;
    }
    if (!user.xboxGamertag && isSignedIn) {
      setGamertagOpen(true);
      return;
    }
    await doJoin(user.xboxGamertag ?? 'MockGT');
  }

  async function handleCancelEvent() {
    if (!event) return;
    setCancelling(true);
    setActionError(null);
    try {
      const token = getAccessToken();
      if (token && isApiConfigured()) {
        await cancelEvent(token, event.id);
      }
      bumpRefresh();
      const next = await fetchEventById(event.id, {discordToken});
      setEvent(next);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not cancel event');
    } finally {
      setCancelling(false);
    }
  }

  async function handleDeleteDraft() {
    if (!event) return;
    setDeleting(true);
    setActionError(null);
    try {
      const token = getAccessToken();
      if (token && isApiConfigured()) {
        await deleteDraftEvent(token, event.id);
      }
      bumpRefresh();
      navigate('/my-events', {replace: true});
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete draft');
    } finally {
      setDeleting(false);
    }
  }

  async function doJoin(gamertag: string) {
    if (!event) return;
    setJoining(true);
    setJoinError(null);
    try {
      const token = getAccessToken();
      if (token && isApiConfigured()) {
        await updateProfile(token, {xbox_gamertag: gamertag});
        refreshUser({...user, xboxGamertag: gamertag});
      }
      await toggleJoin(event, gamertag);
      bumpRefresh();
      const next = await fetchEventById(event.id, {discordToken});
      setEvent(next);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Could not join event');
      const next = await fetchEventById(event.id, {discordToken});
      setEvent(next);
    } finally {
      setJoining(false);
      setGamertagOpen(false);
    }
  }

  if (showLoadingUI) {
    return <PageLoading label="Loading event" className="pb-10 pt-4" />;
  }

  if (!event && loading) {
    return null;
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-sm font-medium text-slate-200">Event not found</p>
        <p className="max-w-xs text-xs text-muted">It may have been removed or the link is incorrect.</p>
        <Link to="/" className="text-sm font-semibold text-accent-purple hover:text-accent-purple-light transition-colors">
          Back to events
        </Link>
      </div>
    );
  }

  const isHost = event.hostDiscordId === user.discordId;
  const isDraft = !isPublishedToDiscord(event);
  const canEnterResults = canSubmitEventResults(event, user);
  const canEdit = canEditEvent(event, user);
  const canCancel = canCancelEvent(event, user);
  const canDelete = canDeleteDraft(event, user);
  const joined = isJoined(event);
  const registrationOpen = isRegistrationOpen(event);
  const started = eventHasStarted(event);
  const full = event.status === 'full' || event.currentPlayers >= event.maxPlayers;
  const showDraftActions = isDraft && isHost;
  const showHostPostStartActions = isHost && (canEnterResults || canCancel);
  const {primary: when} = formatEventTime(event.startsAt, event.timezoneHint);
  const fillPct = Math.round(((1 + event.currentPlayers) / LOBBY_TOTAL_PLAYERS) * 100);
  const completed = isEventCompleted(event);
  const finalized = isEventFinalized(event);
  const resultDisplay = resolveEventResultDisplay(event, resultRows);
  const showResultsSection = completed || (started && !finalized);
  const participationDisabled =
    !(isHost && canEdit) &&
    !joined &&
    (!registrationOpen || full || joining || cancelling);

  return (
    <ContentReveal className="pb-10 pt-4">
      <Link
        to={isDraft && isHost ? '/my-events' : '/'}
        className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted hover:text-accent-purple-light transition-colors duration-200"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </Link>

      {/* Hero */}
      <div className="relative -mx-3 mb-0 h-44 overflow-hidden bg-base sm:-mx-5 md:-mx-8">
        <EventCover
          src={event.coverImageUrl ?? defaultCoverPath(event.type)}
          variant="hero"
          priority
          className="absolute inset-0"
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16"
          style={{
            background:
              'linear-gradient(to top, #06060e 0%, rgba(6, 6, 14, 0.82) 30%, rgba(6, 6, 14, 0.28) 60%, transparent 100%)',
          }}
        />
      </div>

      {/* Title + actions */}
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge type={event.type} />
            {isDraft ? <DraftBadge /> : <StatusBadge status={event.status} />}
          </div>
          <h1 className="mt-1.5 text-xl font-black tracking-tight text-white">{event.title}</h1>
          {event.description && (
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{event.description}</p>
          )}
          <p className="mt-1 text-xs text-muted">by {resolveOrganiserLabel(event)}</p>
        </div>
        {showDraftActions ? (
          <div className="flex shrink-0 flex-col gap-2">
            <Button
              variant="primary"
              className="whitespace-nowrap px-6 py-3 text-xs shadow-none"
              onClick={() => navigate(`/create?edit=${event.id}`)}
            >
              Continue editing
            </Button>
            {canDelete ? (
              <Button
                variant="danger"
                className="whitespace-nowrap px-6 py-2.5 text-xs shadow-none"
                disabled={deleting}
                onClick={() => setConfirmAction('delete')}
              >
                {deleting ? 'Deleting…' : 'Delete draft'}
              </Button>
            ) : null}
          </div>
        ) : showHostPostStartActions ? (
          <div className="flex shrink-0 flex-col gap-2">
            {canEnterResults ? (
              <Button
                variant="primary"
                className="whitespace-nowrap px-6 py-3 text-xs shadow-none"
                onClick={() => navigate(`/event/${event.id}/results`)}
              >
                Submit results
              </Button>
            ) : null}
            {canCancel ? (
              <Button
                variant="danger"
                className="whitespace-nowrap px-6 py-2.5 text-xs shadow-none"
                disabled={cancelling}
                onClick={() => setConfirmAction('cancel')}
              >
                {cancelling ? 'Cancelling…' : 'Cancel event'}
              </Button>
            ) : null}
          </div>
        ) : (
          <Button
            variant={participationButtonVariant(
              isHost,
              canEdit,
              joined,
              registrationOpen,
              full,
            )}
            className="shrink-0 whitespace-nowrap px-6 py-3 text-xs shadow-none"
            disabled={participationDisabled}
            onClick={() => {
              if (isHost && canEdit) navigate(`/create?edit=${event.id}`);
              else void handleJoinClick();
            }}
          >
            {participationButtonLabel(isHost, canEdit, joined, registrationOpen, full)}
          </Button>
        )}
      </div>

      {isDraft && isHost ? <EventStatusBanner variant="draft" /> : null}
      {showHostPostStartActions ? <EventStatusBanner variant="host-in-progress" /> : null}
      {!isHost && started && !finalized ? (
        <EventStatusBanner variant="registration-closed" />
      ) : null}
      {event.lifecycle === 'cancelled' ? <EventStatusBanner variant="cancelled" /> : null}

      {joinError ? <p className="mt-3 text-sm text-accent-red">{joinError}</p> : null}
      {actionError ? <p className="mt-3 text-sm text-accent-red">{actionError}</p> : null}

      <GamertagModal
        open={gamertagOpen}
        initialValue={user.xboxGamertag ?? ''}
        saving={joining}
        onSave={(gt) => void doJoin(gt)}
        onClose={() => setGamertagOpen(false)}
      />

      <ConfirmDialog
        open={confirmAction === 'delete'}
        title="Delete draft?"
        description="Delete this draft permanently? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        busy={deleting}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          setConfirmAction(null);
          void handleDeleteDraft();
        }}
      />
      <ConfirmDialog
        open={confirmAction === 'cancel'}
        title="Cancel event?"
        description="The Discord announcement will be updated and registration will close."
        confirmLabel="Cancel event"
        variant="danger"
        busy={cancelling}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          setConfirmAction(null);
          void handleCancelEvent();
        }}
      />
      {showResultsSection ? (
        <div className="mt-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">Results</p>
          <EventResultsTable
            rows={resultDisplay}
            pending={resultDisplay.length === 0}
            cancelled={event.lifecycle === 'cancelled'}
          />
        </div>
      ) : (
        <div className="mt-4">
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-700',
                  fillPct >= 100
                    ? 'bg-amber-400'
                    : 'bg-gradient-to-r from-accent-purple-dark to-accent-purple-light',
                )}
                style={{width: `${Math.min(fillPct, 100)}%`}}
              />
            </div>
            <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-300">
              {formatLobbyCount(event.currentPlayers)}
            </span>
          </div>
        </div>
      )}

      {/* Info grid */}
      <div className="mt-5 divide-y divide-white/[0.05] rounded-xl border border-white/[0.07] bg-card overflow-hidden">

        {/* Date */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.04]">
            <Calendar className="h-3.5 w-3.5 text-accent-purple-light" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Date & Time</p>
            <p className="mt-0.5 text-sm text-slate-200">{when}</p>
          </div>
        </div>

        {/* Lobby leader */}
        {event.lobbyLeaderGamertag && (
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.04]">
              <Users className="h-3.5 w-3.5 text-accent-green" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Convoy Leader</p>
              <p className="mt-0.5 text-sm font-medium text-slate-200">{event.lobbyLeaderGamertag}</p>
            </div>
          </div>
        )}

        {/* Tracks */}
        {(event.trackCodes?.length ?? 0) > 0 && (
          <div className="flex items-start gap-3 px-4 py-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.04]">
              <RoadIcon className="text-muted-light" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Tracks</p>
              {event.trackCodes!.length === 1 ? (
                <p className="mt-1 font-mono text-sm tracking-wide text-slate-200">
                  {event.trackCodes![0]}
                </p>
              ) : (
                <ol className="mt-1 space-y-0.5">
                  {event.trackCodes!.map((code, i) => (
                    <li key={`${code}-${i}`} className="flex items-center gap-2 text-sm text-slate-200">
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] px-1.5 text-[10px] font-bold text-muted">
                        {i + 1}
                      </span>
                      <span className="font-mono tracking-wide">{code}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}

        {/* Cars */}
        <div className="flex items-start gap-3 px-4 py-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.04]">
            <Car className="h-3.5 w-3.5 text-muted-light" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Car rules</p>
            {event.carRuleMode === 'anything_goes' ? (
              <ul className="mt-2 flex flex-col gap-1">
                <li className={carRuleRowClass}>
                  <span className="truncate font-medium text-slate-200">
                    {event.additionalCarRestrictions?.trim() || 'Open build'}
                  </span>
                  <span
                    className={cn(
                      'text-right font-bold tabular-nums',
                      piClassColor[piToClass(event.maxPi)] ?? 'text-muted',
                    )}
                  >
                    {piToClass(event.maxPi)} {event.maxPi}
                  </span>
                </li>
              </ul>
            ) : event.allowedCars.length === 0 ? (
              <p className="mt-1 text-sm text-muted">Restricted list (details coming soon)</p>
            ) : (
              <ul className="mt-2 divide-y divide-white/[0.05]">
                {event.allowedCars.map((c) => {
                  const maxClass = piToClass(c.maxPi);
                  return (
                    <li key={c.carId} className="py-2.5 first:pt-0 last:pb-0">
                      <div className={carRuleRowClass}>
                        <span className="truncate font-medium text-slate-200">
                          {c.make} {c.model}
                          {c.year ? (
                            <span className="ml-1 text-xs font-normal text-muted">{c.year}</span>
                          ) : null}
                        </span>
                        <span
                          className={cn(
                            'text-right font-bold tabular-nums',
                            piClassColor[maxClass] ?? 'text-muted',
                          )}
                        >
                          {maxClass} {c.maxPi}
                        </span>
                      </div>
                      {(c.tuneShareCode || c.restrictions.length > 0) && (
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                          {c.tuneShareCode && (
                            <span className="flex items-center gap-1">
                              <Wrench className="h-3 w-3 shrink-0" />
                              {c.tuneShareCode}
                            </span>
                          )}
                          {c.restrictions.map((r) => (
                            <span key={r} className="flex items-center gap-1">
                              <Shield className="h-3 w-3 shrink-0" />
                              {r}
                            </span>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Participants */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Participants</p>
          <span className="text-xs tabular-nums text-muted">
            {formatLobbyCount(event.currentPlayers)}
          </span>
        </div>
        {event.participants.length === 0 ? (
          <p className="text-sm text-muted">No participants yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {event.participants.map((p) => (
              <div
                key={p.discordId}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-2',
                  p.discordId === user.discordId ? 'border-accent-purple/25 bg-accent-purple/10' : 'border-white/[0.06] bg-card',
                )}
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-purple-dark/60 to-accent-purple/60 text-[10px] font-bold text-white">
                  {p.username.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-200">{p.gamertag ?? p.username}</p>
                  {p.discordId === user.discordId && (
                    <p className="text-[9px] font-bold uppercase tracking-widest text-accent-purple-light">You</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </ContentReveal>
  );
}
