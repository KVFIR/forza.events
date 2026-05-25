import {useEffect, useState} from 'react';
import {Link, useNavigate, useParams} from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Users,
  Car,
  Shield,
  Wrench,
} from 'lucide-react';
import {RoadIcon} from '../components/icons/RoadIcon';
import type {EventType, ForzaEvent} from '../lib/types';
import {
  canSubmitEventResults,
  fetchEventById,
  fetchEventResults,
  isEventCompleted,
  resolveEventResultDisplay,
  type EventResultRow,
} from '../lib/events';
import {EventResultsTable} from '../components/EventResultsTable';
import {formatEventTime} from '../lib/datetime';
import {cancelEvent, isApiConfigured, updateProfile} from '../lib/api';
import {canCancelEvent, canEditEvent} from '../lib/eventSpec';
import {Badge, CarRuleBadge, StatusBadge} from '../components/ui/Badge';
import {Button} from '../components/ui/Button';
import {GamertagModal} from '../components/GamertagModal';
import {useJoinedEvents} from '../context/JoinedEventsContext';
import {useAuth} from '../context/AuthContext';
import {piToClass} from '../lib/pi';
import {formatLobbyCount, LOBBY_TOTAL_PLAYERS} from '../lib/constants';
import {participationButtonLabel, participationButtonVariant} from '../lib/eventActions';
import {cn} from '../lib/cn';

const typeVisual: Record<EventType, {gradient: string; glow: string}> = {
  road: {
    gradient: 'from-rose-950 via-red-900/50 to-base',
    glow: 'radial-gradient(ellipse at 50% 100%, rgba(225,29,72,0.25) 0%, transparent 70%)',
  },
  dirt: {
    gradient: 'from-amber-950 via-orange-900/50 to-base',
    glow: 'radial-gradient(ellipse at 50% 100%, rgba(217,119,6,0.25) 0%, transparent 70%)',
  },
  drift: {
    gradient: 'from-fuchsia-950 via-purple-900/50 to-base',
    glow: 'radial-gradient(ellipse at 50% 100%, rgba(217,70,239,0.25) 0%, transparent 70%)',
  },
  touge: {
    gradient: 'from-violet-950 via-indigo-900/50 to-base',
    glow: 'radial-gradient(ellipse at 50% 100%, rgba(139,92,246,0.3) 0%, transparent 70%)',
  },
};

const classColor: Record<string, string> = {
  D: 'bg-slate-700 text-slate-200',
  C: 'bg-yellow-900/60 text-yellow-200',
  B: 'bg-orange-900/60 text-orange-200',
  A: 'bg-red-900/60 text-red-200',
  S1: 'bg-violet-900/60 text-violet-200',
  S2: 'bg-fuchsia-900/60 text-fuchsia-200',
  R: 'bg-amber-900/60 text-amber-200',
};

export function EventDetail() {
  const navigate = useNavigate();
  const {id} = useParams<{id: string}>();
  const [event, setEvent] = useState<ForzaEvent | undefined>();
  const [resultRows, setResultRows] = useState<EventResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const {isJoined, toggleJoin, bumpRefresh, refreshKey} = useJoinedEvents();
  const {user, refreshUser, getAccessToken, isMockMode} = useAuth();
  const [gamertagOpen, setGamertagOpen] = useState(false);
  const [joining, setJoining] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    void fetchEventById(id)
      .then(async (ev) => {
        setEvent(ev);
        if (ev && isEventCompleted(ev)) {
          setResultRows(await fetchEventResults(id));
        } else {
          setResultRows([]);
        }
      })
      .finally(() => setLoading(false));
  }, [id, refreshKey]);

  async function handleJoinClick() {
    if (!event) return;
    if (isJoined(event)) {
      await toggleJoin(event);
      const next = await fetchEventById(event.id);
      setEvent(next);
      return;
    }
    if (!user.xboxGamertag && !isMockMode) {
      setGamertagOpen(true);
      return;
    }
    await doJoin(user.xboxGamertag ?? 'MockGT');
  }

  async function handleCancelEvent() {
    if (!event) return;
    const ok = window.confirm(
      'Cancel this event? The Discord announcement will be updated and registration will close.',
    );
    if (!ok) return;
    setCancelling(true);
    try {
      const token = getAccessToken();
      if (token && isApiConfigured()) {
        await cancelEvent(token, event.id);
      }
      bumpRefresh();
      const next = await fetchEventById(event.id);
      setEvent(next);
    } finally {
      setCancelling(false);
    }
  }

  async function doJoin(gamertag: string) {
    if (!event) return;
    setJoining(true);
    try {
      const token = getAccessToken();
      if (token && isApiConfigured()) {
        await updateProfile(token, {xbox_gamertag: gamertag});
        refreshUser({...user, xboxGamertag: gamertag});
      }
      await toggleJoin(event, gamertag);
      bumpRefresh();
      const next = await fetchEventById(event.id);
      setEvent(next);
    } finally {
      setJoining(false);
      setGamertagOpen(false);
    }
  }

  if (loading) return <p className="py-20 text-center text-muted">Loading…</p>;

  if (!event) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-muted">Event not found.</p>
        <Link to="/" className="text-sm font-semibold text-accent-purple hover:text-accent-purple-light transition-colors">
          Back to events
        </Link>
      </div>
    );
  }

  const isHost = event.hostDiscordId === user.discordId;
  const canEnterResults = canSubmitEventResults(event, user);
  const canEdit = canEditEvent(event, user);
  const canCancel = canCancelEvent(event, user);
  const joined = isJoined(event);
  const full = event.status === 'full' || event.currentPlayers >= event.maxPlayers;
  const {primary: when} = formatEventTime(event.startsAt, event.timezoneHint);
  const vis = typeVisual[event.type];
  const fillPct = Math.round(((1 + event.currentPlayers) / LOBBY_TOTAL_PLAYERS) * 100);
  const completed = isEventCompleted(event);
  const resultDisplay = resolveEventResultDisplay(event, resultRows);

  return (
    <div className="pb-10 pt-4 animate-fade-in">
      <Link
        to="/"
        className="mb-5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted hover:text-accent-purple-light transition-colors duration-200"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </Link>

      {/* Hero */}
      <div
        className={cn(
          'relative -mx-3 mb-6 overflow-hidden sm:-mx-5 md:-mx-8',
          'h-44 bg-gradient-to-b',
          vis.gradient,
        )}
        style={event.coverImageUrl ? {backgroundImage: `url(${event.coverImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center'} : undefined}
      >
        <div className="absolute inset-0" style={{background: vis.glow}} />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{backgroundImage: 'repeating-linear-gradient(115deg, rgba(255,255,255,0.8) 0px, rgba(255,255,255,0.8) 1px, transparent 1px, transparent 20px)'}}
        />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-base to-transparent" />
      </div>

      {/* Title + actions */}
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge type={event.type} />
            <CarRuleBadge mode={event.carRuleMode} />
            <StatusBadge status={event.status} />
          </div>
          <h1 className="mt-1.5 text-xl font-black tracking-tight text-white">{event.title}</h1>
          {event.description && (
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{event.description}</p>
          )}
          <p className="mt-1 text-xs text-muted">by {event.hostUsername}</p>
        </div>
        <Button
          variant={participationButtonVariant(
            canEnterResults,
            canCancel,
            isHost,
            canEdit,
            joined,
            full,
          )}
          className="shrink-0 whitespace-nowrap px-6 py-3 text-xs shadow-none"
          disabled={
            !canEnterResults &&
            !canCancel &&
            !(isHost && canEdit) &&
            !joined &&
            ((full && !joined) || joining || cancelling)
          }
          onClick={() => {
            if (canEnterResults) navigate(`/event/${event.id}/results`);
            else if (canCancel) void handleCancelEvent();
            else if (isHost && canEdit) navigate(`/create?edit=${event.id}`);
            else void handleJoinClick();
          }}
        >
          {participationButtonLabel(
            canEnterResults,
            canCancel,
            isHost,
            canEdit,
            joined,
            full,
            joining || cancelling,
          )}
        </Button>
      </div>

      <GamertagModal
        open={gamertagOpen}
        initialValue={user.xboxGamertag ?? ''}
        saving={joining}
        onSave={(gt) => void doJoin(gt)}
        onClose={() => setGamertagOpen(false)}
      />

      {completed ? (
        <div className="mt-4">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted">Results</p>
          <EventResultsTable rows={resultDisplay} pending={resultDisplay.length === 0} />
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
        {event.primaryTrackCode && (
          <div className="flex items-start gap-3 px-4 py-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.04]">
              <RoadIcon className="text-muted-light" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Tracks</p>
              <p className="mt-1 text-sm">
                <span className="text-muted">Primary · </span>
                <span className="font-mono tracking-wide text-slate-200">{event.primaryTrackCode}</span>
              </p>
              {(event.extraTrackCodes?.length ?? 0) > 0 && (
                <ol className="mt-1 space-y-0.5">
                  {event.extraTrackCodes!.map((code, i) => (
                    <li key={code} className="text-sm">
                      <span className="text-muted">Extra {i + 1} · </span>
                      <span className="font-mono tracking-wide text-slate-200">{code}</span>
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
              <p className="mt-1 text-sm text-slate-200">
                Class {event.carClassCap ?? piToClass(event.maxPi)} cap · PI {event.maxPi} max
              </p>
            ) : event.allowedCars.length === 0 ? (
              <p className="mt-1 text-sm text-muted">Restricted list (details coming soon)</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {event.allowedCars.map((c) => {
                  const maxClass = piToClass(c.maxPi);
                  return (
                    <li key={c.carId} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-100">
                          {c.make} {c.model}
                          {c.year ? <span className="ml-1 text-xs font-normal text-muted">{c.year}</span> : null}
                        </p>
                        <span
                          className={cn(
                            'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase',
                            classColor[maxClass] ?? 'bg-white/10 text-muted',
                          )}
                        >
                          {maxClass} {c.maxPi}
                        </span>
                      </div>
                      {(c.tuneShareCode || c.restrictions.length > 0) && (
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
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

    </div>
  );
}
