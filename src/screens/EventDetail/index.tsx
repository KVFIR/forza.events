import {useCallback, useEffect, useMemo} from 'react';
import {useTranslation} from 'react-i18next';
import {ArrowLeft} from 'lucide-react';
import {useLocation, useParams} from 'react-router-dom';
import {ContentReveal} from '../../components/ui/ContentReveal';
import {PageLoading} from '../../components/ui/PageLoading';
import {TextLink} from '../../components/ui/TextButton';
import {useJoinedEvents} from '../../context/JoinedEventsContext';
import {useRichPresenceOverride} from '../../context/DiscordRichPresenceContext';
import {useAuth} from '../../context/AuthContext';
import {loadDiscordSession} from '../../lib/discordAuth';
import {
  buildEventRichPresence,
  type EventRichPresenceRole,
} from '../../lib/discordRichPresence';
import {useEventDetailResults} from '../../hooks/useEventDetailResults';
import {usePageMetaOverride} from '../../context/PageMetaContext';
import type {EventDetailLocationState} from '../../lib/navigationState';
import {buildEventPageMeta} from '../../lib/eventPageMeta';
import {eventDetailBackTo} from '../../lib/returnTo';
import {useResolveEventDisplayStatus} from '../../hooks/useResolveEventDisplayStatus';
import {useEventDetailParticipation} from '../../hooks/useEventDetailParticipation';
import {useDebouncedCallback} from '../../hooks/useDebouncedCallback';
import {useEventLiveUpdates} from '../../hooks/useEventLiveUpdates';
import {isEventUuid} from '@edge/eventPath.ts';
import {fetchEventById} from '../../lib/events';
import {buildEventDetailViewModel} from './eventDetailView';
import {trackOnce} from '../../lib/analytics';
import {useEventDetailLoad} from './useEventDetailLoad';
import {useEventDetailHostActions} from './useEventDetailHostActions';
import {EventDetailHero} from './components/EventDetailHero';
import {EventDetailTitleSection} from './components/EventDetailTitleSection';
import {EventDetailStatusSection} from './components/EventDetailStatusSection';
import {EventDetailProgressSection} from './components/EventDetailProgressSection';
import {EventDetailDescription} from './components/EventDetailDescription';
import {EventDetailInfoPanel} from './components/EventDetailInfoPanel';
import {EventDetailParticipants} from './components/EventDetailParticipants';
import {EventDetailAddGroup} from './components/EventDetailAddGroup';
import {EventDetailOrganiser} from './components/EventDetailOrganiser';
import {EventDetailDialogs} from './components/EventDetailDialogs';

export function EventDetail() {
  const {t} = useTranslation();
  const location = useLocation();
  const {id} = useParams<{id: string}>();
  const routeState = location.state as EventDetailLocationState | null;
  const routeEvent = routeState?.event;
  const {isJoined, bumpRefresh, refreshKey, getLobbyPatch, clearLobbyPatch} = useJoinedEvents();
  const {
    user,
    getAccessToken,
    isSignedIn,
    isStandalone,
    loading: authInitializing,
    authRetrying,
  } = useAuth();
  const discordToken = getAccessToken();
  const showDiscordHandles = isSignedIn || Boolean(loadDiscordSession()?.accessToken);

  const {event, setEvent, loading, displayEvent} = useEventDetailLoad({
    id,
    routeEvent,
    discordToken,
    refreshKey,
    getLobbyPatch,
  });

  const syncEventFromServer = useCallback(() => {
    if (!id) return;
    void fetchEventById(id, {discordToken})
      .then((ev) => {
        if (ev) {
          setEvent(ev);
          clearLobbyPatch(ev.id);
        }
      })
      .catch((err) => console.error('syncEventFromServer', err));
  }, [id, discordToken, setEvent, clearLobbyPatch]);

  const {
    gamertagOpen,
    setGamertagOpen,
    waitlistConfirmOpen,
    dismissWaitlistConfirm,
    joining,
    leaving,
    joinError,
    isParticipationInFlight,
    handleJoinClick,
    joinWithGamertag,
    confirmWaitlistJoin,
  } = useEventDetailParticipation(displayEvent ?? event, syncEventFromServer);

  const reloadEvent = useCallback(() => {
    if (isParticipationInFlight()) return;
    syncEventFromServer();
  }, [isParticipationInFlight, syncEventFromServer]);

  const debouncedReloadEvent = useDebouncedCallback(reloadEvent, 400);

  useEventLiveUpdates(event?.id ?? (id && isEventUuid(id) ? id : undefined), debouncedReloadEvent);

  const {resultRows, resultsLoadFailed, retryResultsLoad} = useEventDetailResults({
    routeKey: id,
    event,
    routeState,
    refreshKey,
  });

  const hostActions = useEventDetailHostActions({
    event,
    setEvent,
    discordToken,
    getAccessToken,
    isSignedIn,
    bumpRefresh,
  });

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
    if (!displayEvent?.id) return;
    trackOnce(`forza.analytics.event_view.${displayEvent.id}`, 'event_view', {
      event_id: displayEvent.id,
    });
  }, [displayEvent?.id]);

  useEffect(() => {
    if (!displayEvent || !richPresenceRole) return;
    setRichPresenceOverride(
      buildEventRichPresence(displayEvent, {role: richPresenceRole, displayStatus}),
    );
    return () => setRichPresenceOverride(null);
  }, [displayEvent, richPresenceRole, displayStatus, setRichPresenceOverride]);

  const view = useMemo(() => {
    if (!event || !displayEvent) return null;
    return buildEventDetailViewModel({
      event,
      displayEvent,
      displayStatus,
      user,
      resultRows,
      isJoined,
      isSignedIn,
      showDiscordHandles,
      isStandalone,
      authInitializing,
      joining,
      leaving,
      cancelling: hostActions.cancelling,
      t,
    });
  }, [
    event,
    displayEvent,
    displayStatus,
    user,
    resultRows,
    isJoined,
    isSignedIn,
    showDiscordHandles,
    isStandalone,
    authInitializing,
    joining,
    leaving,
    hostActions.cancelling,
    t,
  ]);

  const pageMeta = useMemo(() => {
    if (!event) return null;
    const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
    return buildEventPageMeta(event, {
      siteOrigin: origin,
      pageUrl: origin ? `${origin}${location.pathname}` : undefined,
    });
  }, [event, location.pathname]);
  usePageMetaOverride(pageMeta);

  if (!event) {
    // Drafts need a Discord token; wait on every surface so browser session restore
    // does not flash not-found before host-draft fetch.
    const awaitingAuthForPossibleDraft = authInitializing && !routeEvent;
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

  if (!view) {
    return <PageLoading label={t('loading.event')} className="pb-10 pt-4" />;
  }

  return (
    <ContentReveal className="pb-10 pt-4">
      <TextLink
        to={eventDetailBackTo(routeState?.from, {
          isDraft: view.isDraft,
          isHost: view.isHost,
        })}
        tone="nav"
        className="mb-5 inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('common.back')}
      </TextLink>

      <EventDetailHero event={event} />

      <EventDetailTitleSection
        event={event}
        displayStatus={displayStatus}
        view={view}
        detailFrom={routeState?.from}
        cancelling={hostActions.cancelling}
        completing={hostActions.completing}
        retryingRatings={hostActions.retryingRatings}
        authRetrying={authRetrying}
        leaving={leaving}
        onConfirmCancel={() => hostActions.setConfirmAction('cancel')}
        onConfirmComplete={() => hostActions.setConfirmAction('complete')}
        onRetryRatings={() => void hostActions.handleRetryRatings()}
        onJoinClick={() => void handleJoinClick()}
      />

      <EventDetailStatusSection
        event={event}
        view={view}
        joinError={joinError}
        actionError={hostActions.actionError}
      />

      <EventDetailDialogs
        gamertagOpen={gamertagOpen}
        gamertagInitial={user.xboxGamertag ?? ''}
        joining={joining}
        onGamertagSave={(gt) => void joinWithGamertag(gt)}
        onGamertagClose={() => setGamertagOpen(false)}
        waitlistConfirmOpen={waitlistConfirmOpen}
        onWaitlistConfirm={() => void confirmWaitlistJoin()}
        onWaitlistDismiss={dismissWaitlistConfirm}
        confirmAction={hostActions.confirmAction}
        cancelling={hostActions.cancelling}
        completing={hostActions.completing}
        onConfirmDismiss={() => hostActions.setConfirmAction(null)}
        onCancelConfirm={() => {
          hostActions.setConfirmAction(null);
          void hostActions.handleCancelEvent();
        }}
        onCompleteConfirm={() => {
          hostActions.setConfirmAction(null);
          void hostActions.handleCompleteWithoutResults();
        }}
      />

      <EventDetailProgressSection
        view={view}
        resultsLoadFailed={resultsLoadFailed}
        onRetryResultsLoad={retryResultsLoad}
        viewerDiscordId={user.discordId}
      />

      <EventDetailInfoPanel
        event={event}
        when={view.when}
        showJoinXboxHint={view.showJoinXboxHint}
        joinXboxLeader={view.viewerConvoyLeader?.gamertag}
        showConvoyLeaderXboxHint={view.showConvoyLeaderXboxHint}
      />

      <EventDetailDescription description={event.description ?? ''} />

      <EventDetailParticipants
        key={event.id}
        view={view}
        viewerDiscordId={user.discordId}
        showDiscordHandles={showDiscordHandles}
        accessToken={discordToken}
        onRosterChanged={syncEventFromServer}
      />

      {view.canAddGroup ? (
        <div className="mt-4">
          <EventDetailAddGroup
            event={event}
            view={view}
            accessToken={discordToken}
            onAdded={syncEventFromServer}
          />
        </div>
      ) : null}

      <EventDetailOrganiser event={event} />
    </ContentReveal>
  );
}
