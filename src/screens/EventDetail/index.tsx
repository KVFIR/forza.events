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
import {
  buildEventRichPresence,
  type EventRichPresenceRole,
} from '../../lib/discordRichPresence';
import {useEventDetailResults} from '../../hooks/useEventDetailResults';
import type {EventDetailLocationState} from '../../lib/navigationState';
import {eventDetailBackTo} from '../../lib/returnTo';
import {useResolveEventDisplayStatus} from '../../hooks/useResolveEventDisplayStatus';
import {useEventDetailParticipation} from '../../hooks/useEventDetailParticipation';
import {useEventLiveUpdates} from '../../hooks/useEventLiveUpdates';
import {fetchEventById} from '../../lib/events';
import {buildEventDetailViewModel} from './eventDetailView';
import {useEventDetailLoad} from './useEventDetailLoad';
import {useEventDetailHostActions} from './useEventDetailHostActions';
import {EventDetailHero} from './components/EventDetailHero';
import {EventDetailTitleSection} from './components/EventDetailTitleSection';
import {EventDetailStatusSection} from './components/EventDetailStatusSection';
import {EventDetailProgressSection} from './components/EventDetailProgressSection';
import {EventDetailInfoPanel} from './components/EventDetailInfoPanel';
import {EventDetailParticipants} from './components/EventDetailParticipants';
import {EventDetailDialogs} from './components/EventDetailDialogs';

export function EventDetail() {
  const {t} = useTranslation();
  const location = useLocation();
  const {id} = useParams<{id: string}>();
  const routeState = location.state as EventDetailLocationState | null;
  const routeEvent = routeState?.event;
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

  const {event, setEvent, loading, displayEvent} = useEventDetailLoad({
    id,
    routeEvent,
    discordToken,
    refreshKey,
    getLobbyPatch,
  });

  const {
    gamertagOpen,
    setGamertagOpen,
    joining,
    leaving,
    joinError,
    isParticipationInFlight,
    handleJoinClick,
    doJoin,
  } = useEventDetailParticipation(event);

  const reloadEvent = useCallback(() => {
    if (!id || isParticipationInFlight()) return;
    void fetchEventById(id, {discordToken})
      .then((ev) => {
        if (ev) setEvent(ev);
      })
      .catch((err) => console.error('reloadEvent', err));
  }, [id, discordToken, isParticipationInFlight, setEvent]);

  useEventLiveUpdates(id, reloadEvent);

  const {resultRows, resultsLoadFailed, retryResultsLoad} = useEventDetailResults({
    eventId: id,
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
    isStandalone,
    authInitializing,
    joining,
    leaving,
    hostActions.cancelling,
    t,
  ]);

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
        deleting={hostActions.deleting}
        cancelling={hostActions.cancelling}
        authRetrying={authRetrying}
        leaving={leaving}
        onConfirmDelete={() => hostActions.setConfirmAction('delete')}
        onConfirmCancel={() => hostActions.setConfirmAction('cancel')}
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
        onGamertagSave={(gt) => void doJoin(gt)}
        onGamertagClose={() => setGamertagOpen(false)}
        confirmAction={hostActions.confirmAction}
        deleting={hostActions.deleting}
        cancelling={hostActions.cancelling}
        onConfirmDismiss={() => hostActions.setConfirmAction(null)}
        onDeleteConfirm={() => {
          hostActions.setConfirmAction(null);
          void hostActions.handleDeleteDraft();
        }}
        onCancelConfirm={() => {
          hostActions.setConfirmAction(null);
          void hostActions.handleCancelEvent();
        }}
      />

      <EventDetailProgressSection
        view={view}
        resultsLoadFailed={resultsLoadFailed}
        onRetryResultsLoad={retryResultsLoad}
        viewerDiscordId={user.discordId}
      />

      <EventDetailInfoPanel event={event} when={view.when} />

      <EventDetailParticipants view={view} viewerDiscordId={user.discordId} />
    </ContentReveal>
  );
}
