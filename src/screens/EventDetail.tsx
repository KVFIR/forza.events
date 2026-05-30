import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {busyLabel} from '../i18n/busyLabels';
import {useLocation, useNavigate, useParams} from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Users,
  Car,
  Shield,
  Wrench,
} from 'lucide-react';
import {COVER_HERO_BAND_CLASS, COVER_PAGE_BLEED_CLASS, coverDisplayUrl} from '../lib/coverImage';
import {defaultCoverPath} from '../lib/eventCovers';
import {RoadIcon} from '../components/icons/RoadIcon';
import {formatTrackDisplayLine} from '../lib/eventTracks';
import type {ForzaEvent} from '../lib/types';
import {
  canSubmitEventResults,
  fetchEventById,
  isEventSuccessfullyCompleted,
  resolveEventResultDisplay,
  shouldShowEventResults,
  userHasParticipantRow,
} from '../lib/events';
import {EventResultsTable} from '../components/EventResultsTable';
import {ParticipantDisplayNames} from '../components/ParticipantDisplayNames';
import {UserAvatar} from '../components/UserAvatar';
import {ContentReveal} from '../components/ui/ContentReveal';
import {PageLoading} from '../components/ui/PageLoading';
import {formatEventStart} from '../lib/datetime';
import {cancelEvent, deleteDraftEvent, isApiConfigured} from '../lib/api';
import {
  canCancelEvent,
  canDeleteDraft,
  canEditEvent,
  canLeaveRegistration,
  eventHasStarted,
  isEventFinalized,
  isPublishedToDiscord,
  isRegistrationOpen,
} from '../lib/eventSpec';
import {EventStatusBanner} from '../components/EventStatusBanner';
import {Alert} from '../components/ui/Alert';
import {Badge, DraftBadge, StatusBadge} from '../components/ui/Badge';
import {Button} from '../components/ui/Button';
import {iconTileClass, sectionLabelClass} from '../components/ui/formStyles';
import {Panel} from '../components/ui/Panel';
import {TextLink} from '../components/ui/TextButton';
import {ConfirmDialog} from '../components/ui/ConfirmDialog';
import {GamertagModal} from '../components/GamertagModal';
import {useJoinedEvents} from '../context/JoinedEventsContext';
import {useRichPresenceOverride} from '../context/DiscordRichPresenceContext';
import {useAuth} from '../context/AuthContext';
import {
  buildEventRichPresence,
  type EventRichPresenceRole,
} from '../lib/discordRichPresence';
import {useEventDetailResults} from '../hooks/useEventDetailResults';
import {useEventLiveUpdates} from '../hooks/useEventLiveUpdates';
import type {EventDetailLocationState} from '../lib/navigationState';
import {useResolveEventDisplayStatus} from '../hooks/useResolveEventDisplayStatus';
import {formatCarDisplayName} from '../lib/carDisplay';
import {piClassColor, piToClass} from '../lib/pi';
import {formatLobbyCount, LOBBY_TOTAL_PLAYERS} from '../lib/constants';
import {resolveOrganiserLabel} from '../lib/organiser';
import {resolveConvoyLeader, resolveRegisteredDrivers} from '../lib/eventRoster';
import {participationButtonLabel, participationButtonVariant} from '../lib/eventActions';
import {mergeOptimisticEventPatch} from '../lib/eventParticipation';
import {useEventDetailParticipation} from '../hooks/useEventDetailParticipation';
import {cn} from '../lib/cn';

const carRuleRowClass =
  'grid grid-cols-[minmax(0,1fr)_3.5rem] items-center gap-x-3 text-sm leading-tight';

export function EventDetail() {
  const {t} = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const {id} = useParams<{id: string}>();
  const routeState = location.state as EventDetailLocationState | null;
  const routeEvent = routeState?.event;
  const [event, setEvent] = useState<ForzaEvent | undefined>();
  const [loading, setLoading] = useState(true);
  const loadedForIdRef = useRef<string | null>(null);
  const fetchSeqRef = useRef(0);
  const {isJoined, bumpRefresh, refreshKey, getLobbyPatch} = useJoinedEvents();
  const {
    user,
    getAccessToken,
    isSignedIn,
    isStandalone,
    loading: authInitializing,
    authRetrying,
  } = useAuth();
  const discordToken = getAccessToken();
  const [cancelling, setCancelling] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'delete' | 'cancel' | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const {resultRows, resultsLoadFailed, retryResultsLoad} = useEventDetailResults({
    eventId: id,
    event,
    routeState,
    refreshKey,
  });

  const participation = useEventDetailParticipation(event);
  const {
    gamertagOpen,
    setGamertagOpen,
    joining,
    leaving,
    joinError,
    isParticipationInFlight,
    handleJoinClick,
    doJoin,
  } = participation;

  const reloadEvent = useCallback(() => {
    if (!id || isParticipationInFlight()) return;
    void fetchEventById(id, {discordToken})
      .then((ev) => {
        if (ev) setEvent(ev);
      })
      .catch((err) => console.error('reloadEvent', err));
  }, [id, discordToken, isParticipationInFlight]);

  useEventLiveUpdates(id, reloadEvent);

  const displayEvent = useMemo(
    () =>
      event && id ? mergeOptimisticEventPatch(event, getLobbyPatch(id)) : undefined,
    [event, id, getLobbyPatch],
  );
  const displayStatus = useResolveEventDisplayStatus(displayEvent);
  const {setRichPresenceOverride} = useRichPresenceOverride();

  const richPresenceRole: EventRichPresenceRole | undefined = displayEvent
    ? displayEvent.hostDiscordId === user.discordId
      ? 'host'
      : isJoined(displayEvent)
        ? 'joined'
        : 'viewing'
    : undefined;

  useEffect(() => {
    if (!displayEvent || !richPresenceRole) return;
    setRichPresenceOverride(
      buildEventRichPresence(displayEvent, {role: richPresenceRole, displayStatus}),
    );
    return () => setRichPresenceOverride(null);
  }, [displayEvent, richPresenceRole, displayStatus, setRichPresenceOverride]);

  useEffect(() => {
    if (!id) return;
    const seq = ++fetchSeqRef.current;
    const idChanged = loadedForIdRef.current !== id;

    if (idChanged) {
      loadedForIdRef.current = id;
      setEvent(routeEvent?.id === id ? routeEvent : undefined);
      setLoading(true);
    }

    void fetchEventById(id, {discordToken})
      .then((ev) => {
        if (fetchSeqRef.current !== seq) return;
        if (ev) {
          setEvent(ev);
        } else if (!routeEvent || routeEvent.id !== id) {
          setEvent(undefined);
        }
      })
      .catch((err) => console.error('fetchEventById', err))
      .finally(() => {
        if (fetchSeqRef.current === seq) setLoading(false);
      });
  }, [id, refreshKey, discordToken, routeEvent]);

  async function handleCancelEvent() {
    if (!event) return;
    const token = getAccessToken();
    if (!isSignedIn || !token) {
      setActionError(t('auth.signInDiscordCancel'));
      return;
    }
    setCancelling(true);
    setActionError(null);
    try {
      if (isApiConfigured()) {
        await cancelEvent(token, event.id);
      }
      bumpRefresh();
      const next = await fetchEventById(event.id, {discordToken});
      setEvent(next);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('eventDetail.cancelFailed'));
    } finally {
      setCancelling(false);
    }
  }

  async function handleDeleteDraft() {
    if (!event) return;
    const token = getAccessToken();
    if (!isSignedIn || !token) {
      setActionError(t('auth.signInDiscordDelete'));
      return;
    }
    setDeleting(true);
    setActionError(null);
    try {
      if (isApiConfigured()) {
        await deleteDraftEvent(token, event.id);
      }
      bumpRefresh();
      navigate('/my-events', {replace: true});
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('eventDetail.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  }

  if (!event) {
    const awaitingAuthForPossibleDraft =
      !isStandalone && authInitializing && !routeEvent;
    if (loading || awaitingAuthForPossibleDraft) {
      return <PageLoading label={t('loading.event')} className="pb-10 pt-4" />;
    }

    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-sm font-medium text-slate-200">{t('eventDetail.notFound')}</p>
        <p className="max-w-xs text-xs text-muted">{t('eventDetail.notFoundDesc')}</p>
        <TextLink to="/" tone="emphasis">
          {t('eventDetail.backToEvents')}
        </TextLink>
      </div>
    );
  }

  const ev = displayEvent!;

  const isHost = ev.hostDiscordId === user.discordId;
  const isDraft = !isPublishedToDiscord(event);
  const canEnterResults = canSubmitEventResults(event, user);
  const canEdit = canEditEvent(event, user);
  const canCancel = canCancelEvent(event, user);
  const canDelete = canDeleteDraft(event, user);
  const joined = isJoined(event);
  const isInParticipants = userHasParticipantRow(ev, user);
  const registrationOpen = isRegistrationOpen(ev);
  const canLeave = canLeaveRegistration(ev);
  const started = eventHasStarted(ev);
  const full = displayStatus === 'full';
  const showDraftActions = isDraft && isHost;
  const showHostPostStartActions = isHost && started && (canEnterResults || canCancel);
  const when = formatEventStart(ev.startsAt);
  const fillPct = Math.round((ev.currentPlayers / LOBBY_TOTAL_PLAYERS) * 100);
  const finalized = isEventFinalized(event);
  const resultDisplay = resolveEventResultDisplay(
    event,
    resultRows,
    t('results.unknownDriver'),
  );
  const convoyLeader = resolveConvoyLeader(ev, user.discordId);
  const registeredDrivers = resolveRegisteredDrivers(ev.participants);
  /** Lifecycle from server row — not `displayEvent` (lobby patch only). */
  const showResultsSection = shouldShowEventResults(event);
  const showRegistrationProgress =
    !showResultsSection && event.lifecycle !== 'cancelled';
  const resultsAwaitingHost =
    showResultsSection &&
    !isEventSuccessfullyCompleted(event) &&
    resultDisplay.length === 0;
  const showParticipantActions = !isHost && !isDraft;
  const needsSignInToParticipate =
    showParticipantActions && !isSignedIn && !isStandalone && !authInitializing;
  const participationBusy = joining || leaving;
  const participationAction = leaving ? 'leaving' : joining ? 'joining' : null;
  const isCurrentConvoyLeader = convoyLeader?.isYou ?? false;
  const participationDisabled =
    !isSignedIn ||
    participationBusy ||
    cancelling ||
    isCurrentConvoyLeader ||
    (joined ? !canLeave : isInParticipants || !registrationOpen || full);
  const showJoinXboxHint =
    (joined || isInParticipants) &&
    !isHost &&
    !isDraft &&
    !finalized &&
    !started &&
    convoyLeader != null &&
    !convoyLeader.isYou;

  return (
    <ContentReveal className="pb-10 pt-4">
      <TextLink
        to={isDraft && isHost ? '/my-events' : '/'}
        tone="nav"
        className="mb-5 inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('common.back')}
      </TextLink>

      {/* Hero — background cover avoids <img> sizing quirks with bleed margins */}
      <div
        className={cn(
          'event-detail-hero relative mb-0 overflow-hidden rounded-t-xl bg-base bg-cover bg-center bg-no-repeat ring-1 ring-inset ring-white/[0.08] sm:rounded-t-2xl',
          COVER_PAGE_BLEED_CLASS,
          COVER_HERO_BAND_CLASS,
        )}
        style={{
          backgroundImage: `url(${coverDisplayUrl(
            event.coverImageUrl ?? defaultCoverPath(event.type),
            'hero',
          )})`,
        }}
        role="img"
        aria-label={event.title}
      >
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
            {isDraft ? <DraftBadge /> : <StatusBadge status={displayStatus} />}
          </div>
          <h1 className="mt-1.5 text-xl font-black tracking-tight text-white">{event.title}</h1>
          {event.description && (
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{event.description}</p>
          )}
          <p className="mt-1 text-xs text-muted">
            {t('common.by')} {resolveOrganiserLabel(event)}
          </p>
        </div>
        {showDraftActions ? (
          <div className="flex shrink-0 flex-col gap-2">
            <Button
              variant="primary"
              size="toolbar"
              className="shrink-0 whitespace-nowrap"
              onClick={() => navigate(`/create?edit=${event.id}`)}
            >
              {t('eventDetail.continueEditing')}
            </Button>
            {canDelete ? (
              <Button
                variant="danger"
                size="toolbar"
                className="shrink-0 whitespace-nowrap"
                disabled={deleting}
                onClick={() => setConfirmAction('delete')}
              >
                {deleting ? busyLabel('deleting') : t('eventDetail.deleteDraft')}
              </Button>
            ) : null}
          </div>
        ) : showHostPostStartActions ? (
          <div className="flex shrink-0 flex-col gap-2">
            {canEnterResults ? (
              <Button
                variant="primary"
                size="toolbar"
                className="shrink-0 whitespace-nowrap"
                onClick={() => navigate(`/event/${event.id}/results`)}
              >
                {t('eventDetail.submitResults')}
              </Button>
            ) : null}
            {canCancel ? (
              <Button
                variant="danger"
                size="toolbar"
                className="shrink-0 whitespace-nowrap"
                disabled={cancelling}
                onClick={() => setConfirmAction('cancel')}
              >
                {cancelling ? busyLabel('cancelling') : t('eventDetail.cancelEvent')}
              </Button>
            ) : null}
          </div>
        ) : isHost ? (
          canEdit ? (
            <Button
              variant="secondary"
              size="toolbar"
              className="shrink-0 whitespace-nowrap"
              onClick={() => navigate(`/create?edit=${event.id}`)}
            >
              {t('eventDetail.edit')}
            </Button>
          ) : null
        ) : showParticipantActions ? (
          <Button
            variant={
              needsSignInToParticipate
                ? 'secondary'
                : participationButtonVariant(
                    joined,
                    registrationOpen,
                    full,
                    canLeave,
                    participationAction,
                    isCurrentConvoyLeader,
                  )
            }
            size="toolbar"
            className="shrink-0 whitespace-nowrap"
            disabled={needsSignInToParticipate ? authRetrying : participationDisabled}
            onClick={() => void handleJoinClick()}
          >
            {needsSignInToParticipate
              ? authRetrying
                ? busyLabel('signingIn')
                : t('auth.signInToJoin')
              : participationBusy
                ? leaving
                  ? busyLabel('leaving')
                  : busyLabel('working')
                : participationButtonLabel(joined, registrationOpen, full, canLeave, isCurrentConvoyLeader)}
          </Button>
        ) : null}
      </div>

      {isDraft && isHost ? <EventStatusBanner variant="draft" /> : null}
      {showHostPostStartActions ? <EventStatusBanner variant="host-in-progress" /> : null}
      {!isHost && started && !finalized ? (
        <EventStatusBanner variant="registration-closed" />
      ) : null}
      {event.lifecycle === 'cancelled' ? <EventStatusBanner variant="cancelled" /> : null}

      {showJoinXboxHint ? (
        <Alert variant="info" title={t('participation.xboxHintTitle')} className="mt-3 py-2.5 text-sm">
          {t('participation.xboxHintBody', {leader: convoyLeader.gamertag})}
        </Alert>
      ) : null}

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
        title={t('eventDetail.deleteDraftTitle')}
        description={t('eventDetail.deleteDraftDesc')}
        confirmLabel={t('common.delete')}
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
        title={t('eventDetail.cancelEventTitle')}
        description={t('eventDetail.cancelEventDesc')}
        confirmLabel={t('eventDetail.cancelEvent')}
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
          <EventResultsTable
            rows={resultDisplay}
            pending={resultsAwaitingHost}
            loadFailed={resultsLoadFailed}
            onRetryLoad={retryResultsLoad}
            viewerDiscordId={user.discordId}
          />
        </div>
      ) : showRegistrationProgress ? (
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
              {formatLobbyCount(ev.currentPlayers)}
            </span>
          </div>
        </div>
      ) : null}

      <Panel divided className="mt-5 overflow-hidden">

        {/* Date */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className={iconTileClass}>
            <Calendar className="h-3.5 w-3.5 text-accent-purple-light" />
          </div>
          <div>
            <p className={sectionLabelClass}>{t('eventDetail.dateTime')}</p>
            <p className="mt-0.5 text-sm text-slate-200">{when}</p>
          </div>
        </div>

        {/* Lobby leader */}
        {event.lobbyLeaderGamertag && (
          <div className="flex items-center gap-3 px-4 py-3">
            <div className={iconTileClass}>
              <Users className="h-3.5 w-3.5 text-accent-green" />
            </div>
            <div>
              <p className={sectionLabelClass}>{t('eventDetail.convoyLeader')}</p>
              <p className="mt-0.5 text-sm font-medium text-slate-200">{event.lobbyLeaderGamertag}</p>
            </div>
          </div>
        )}

        {/* Tracks */}
        {(event.tracks?.length ?? 0) > 0 && (
          <div className="flex items-start gap-3 px-4 py-3">
            <div className={iconTileClass}>
              <RoadIcon className="text-muted-light" />
            </div>
            <div className="min-w-0">
              <p className={sectionLabelClass}>{t('eventDetail.tracks')}</p>
              {event.tracks!.length === 1 ? (
                <p
                  className={cn(
                    'mt-1 text-sm text-slate-200',
                    event.tracks![0].shareCode && !event.tracks![0].name
                      ? 'font-mono tracking-wide'
                      : '',
                  )}
                >
                  {formatTrackDisplayLine(
                    event.tracks![0],
                    t('create.trackFallback', {n: 1}),
                  )}
                </p>
              ) : (
                <ol className="mt-1 space-y-0.5">
                  {event.tracks!.map((track, i) => (
                    <li
                      key={`${track.name}-${track.shareCode ?? ''}-${i}`}
                      className="flex items-start gap-2 text-sm text-slate-200"
                    >
                      <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] px-1.5 text-[10px] font-bold text-muted">
                        {i + 1}
                      </span>
                      <span
                        className={
                          track.shareCode && !track.name ? 'font-mono tracking-wide' : ''
                        }
                      >
                        {formatTrackDisplayLine(track, t('create.trackFallback', {n: i + 1}))}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}

        {/* Cars */}
        <div className="flex items-start gap-3 px-4 py-3">
          <div className={iconTileClass}>
            <Car className="h-3.5 w-3.5 text-muted-light" />
          </div>
          <div className="min-w-0 flex-1">
            <p className={sectionLabelClass}>{t('eventDetail.carRules')}</p>
            {event.carRuleMode === 'anything_goes' ? (
              <ul className="mt-2 flex flex-col gap-1">
                <li className={carRuleRowClass}>
                  <span className="truncate font-medium text-slate-200">
                    {event.additionalCarRestrictions?.trim() || t('common.openBuild')}
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
              <p className="mt-1 text-sm text-muted">{t('eventDetail.restrictedSoon')}</p>
            ) : (
              <ul className="mt-2 divide-y divide-white/[0.05]">
                {event.allowedCars.map((c) => {
                  const maxClass = piToClass(c.maxPi);
                  return (
                    <li key={c.carId} className="py-2.5 first:pt-0 last:pb-0">
                      <div className={carRuleRowClass}>
                        <span className="truncate font-medium text-slate-200">
                          {formatCarDisplayName(c)}
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
      </Panel>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-white">{t('eventDetail.participants')}</p>
          <span className="text-xs tabular-nums text-muted">
            {formatLobbyCount(ev.currentPlayers)}
          </span>
        </div>
        <div className="space-y-2">
          {convoyLeader ? (
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2',
                convoyLeader.isYou
                  ? 'border-accent-green/25 bg-accent-green/10'
                  : 'border-white/[0.06] bg-card',
              )}
            >
              <UserAvatar
                src={convoyLeader.avatarUrl}
                name={convoyLeader.username ?? convoyLeader.gamertag}
                size="xs"
                variant="green"
              />
              <div className="min-w-0">
                <ParticipantDisplayNames
                  gamertag={convoyLeader.gamertag}
                  username={convoyLeader.username ?? ''}
                />
                <p className="text-[9px] font-bold uppercase tracking-widest text-accent-green/90">
                  {t('eventDetail.convoyLeaderBadge')}
                  {convoyLeader.isYou ? t('eventDetail.youSuffix') : ''}
                  {convoyLeader.discordId === ev.hostDiscordId ? t('eventDetail.hostSuffix') : ''}
                </p>
              </div>
            </div>
          ) : null}
          {registeredDrivers.length === 0 ? (
            <p className="text-sm text-muted">
              {convoyLeader ? t('eventDetail.noDriversYet') : t('eventDetail.noParticipantsYet')}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {registeredDrivers.map((p) => (
                <div
                  key={p.discordId}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2',
                    p.discordId === user.discordId
                      ? 'border-accent-purple/25 bg-accent-purple/10'
                      : 'border-white/[0.06] bg-card',
                  )}
                >
                  <UserAvatar
                    src={p.avatarUrl}
                    name={p.gamertag ?? p.username}
                    size="xs"
                    variant="purple"
                  />
                  <div className="min-w-0">
                    <ParticipantDisplayNames
                      gamertag={p.gamertag}
                      username={p.username}
                      showDiscordUsername={
                        isHost && p.discordId !== ev.hostDiscordId
                      }
                    />
                    {p.discordId === user.discordId && (
                      <p className="text-[9px] font-bold uppercase tracking-widest text-accent-purple-light">
                        {t('common.you')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ContentReveal>
  );
}
