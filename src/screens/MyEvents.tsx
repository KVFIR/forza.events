import {useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {useNavigate} from 'react-router-dom';
import {Alert} from '../components/ui/Alert';
import {EventList} from '../components/EventList';
import {EventListFilterChips} from '../components/EventListFilterChips';
import {EventListMetaSelect} from '../components/EventListMetaSelect';
import {SignInRequiredState} from '../components/SignInRequiredState';
import {useAuth} from '../context/AuthContext';
import {useMyEventsCatalog} from '../hooks/useMyEventsCatalog';
import {useParticipantResults} from '../hooks/useParticipantResults';
import {EVENT_GAMES, eventGameLabel, type ForzaGame} from '../lib/eventGames';
import {
  filterByCancelled,
  filterByGame,
  sortMyEventsPublished,
  type CancelledFilter,
  type EventSortKey,
  type MyEventsScope,
} from '../lib/eventList';
import {userHadActiveSeat} from '../lib/events';
import {isEventSuccessfullyCompleted} from '../lib/eventSpec';

type GameFilter = ForzaGame | 'all';

export function MyEvents() {
  const {t} = useTranslation();
  const navigate = useNavigate();

  const scopeOptions = useMemo(
    () => [
      {value: 'hosted' as const, label: t('myEvents.scopeHosted')},
      {value: 'joined' as const, label: t('myEvents.scopeJoined')},
    ],
    [t],
  );

  const cancelledOptions = useMemo(
    () => [
      {
        value: 'cancelled' as const,
        label: t('eventStatus.cancelled'),
        selectedClassName: 'border-white/20 bg-white/[0.08] text-slate-200',
      },
    ],
    [t],
  );

  const gameOptions = useMemo(
    () =>
      EVENT_GAMES.map((g) => ({
        value: g.value,
        label: eventGameLabel(g.value),
        selectedClassName: g.chipSelected,
      })),
    [t],
  );

  const sortOptions: {value: EventSortKey; label: string}[] = [
    {value: 'event_date', label: t('browse.sortEventDate')},
    {value: 'created', label: t('browse.sortCreated')},
    {value: 'fill', label: t('browse.sortFill')},
  ];

  const [scope, setScope] = useState<MyEventsScope>('all');
  const [gameFilter, setGameFilter] = useState<GameFilter>('all');
  const [cancelledFilter, setCancelledFilter] = useState<CancelledFilter>('hide');
  const [sort, setSort] = useState<EventSortKey>('event_date');
  const {
    isSignedIn,
    loading: authLoading,
    user,
    isStandalone,
    authRetrying,
    retryDiscordAuth,
  } = useAuth();
  const {filtered: scoped, isLoading, isRefreshing, loadError, draftsLoadError, refetch} =
    useMyEventsCatalog(scope);

  const filtered = useMemo(
    () =>
      sortMyEventsPublished(
        filterByCancelled(filterByGame(scoped, gameFilter), cancelledFilter),
        sort,
      ),
    [scoped, gameFilter, cancelledFilter, sort],
  );

  const placementEventIds = useMemo(
    () =>
      filtered
        .filter((e) => isEventSuccessfullyCompleted(e) && userHadActiveSeat(e, user))
        .map((e) => e.id),
    [filtered, user],
  );
  const participantResults = useParticipantResults(placementEventIds, user.discordId);

  const hasActiveFilters =
    scope !== 'all' || gameFilter !== 'all' || cancelledFilter !== 'hide';

  const clearFilters = () => {
    setScope('all');
    setGameFilter('all');
    setCancelledFilter('hide');
  };

  if (!authLoading && !isSignedIn) {
    return (
      <SignInRequiredState
        description={t('auth.signInMyEvents')}
        busy={!isStandalone ? authRetrying : false}
        onRetry={!isStandalone ? () => void retryDiscordAuth() : undefined}
        className="pb-8 pt-5"
      />
    );
  }

  const emptyTitle = loadError
    ? t('myEvents.loadError')
    : scope === 'joined'
      ? t('myEvents.noJoined')
      : t('myEvents.emptyList');

  const emptyDescription = loadError
    ? t('myEvents.loadErrorDesc')
    : scope !== 'joined' && isSignedIn
      ? t('myEvents.emptyHostedDesc')
      : undefined;

  const draftsHint =
    !loadError && draftsLoadError === 'unauthorized'
      ? t('myEvents.draftsUnauthorized')
      : !loadError && draftsLoadError === 'fetch_failed'
        ? t('myEvents.draftsFailed')
        : null;

  return (
    <div className="pb-8 pt-5">
      {draftsHint ? (
        <Alert variant="warning" className="mb-3">
          {draftsHint}
        </Alert>
      ) : null}
      <EventList
        events={filtered}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        loadError={loadError}
        onRetry={refetch}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        emptyAction={
          hasActiveFilters
            ? {label: t('common.clearFilters'), onClick: clearFilters}
            : !loadError && isSignedIn
              ? {label: t('myEvents.createEvent'), onClick: () => navigate('/create')}
              : undefined
        }
        participantResults={participantResults}
        sortControl={
          <EventListMetaSelect
            value={sort}
            onChange={setSort}
            options={sortOptions}
            aria-label={t('browse.sortEvents')}
          />
        }
        filters={
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
            <EventListFilterChips
              value={gameFilter}
              onChange={setGameFilter}
              options={gameOptions}
              deselectValue="all"
              aria-label={t('browse.filterByGame')}
            />
            <span className="h-3 w-px shrink-0 bg-white/10" aria-hidden />
            <EventListFilterChips
              value={scope}
              onChange={setScope}
              options={scopeOptions}
              deselectValue="all"
              aria-label={t('myEvents.filterAria')}
            />
            <span className="h-3 w-px shrink-0 bg-white/10" aria-hidden />
            <EventListFilterChips
              value={cancelledFilter}
              onChange={setCancelledFilter}
              options={cancelledOptions}
              deselectValue="hide"
              aria-label={t('myEvents.filterByCancelled')}
            />
          </div>
        }
      />
    </div>
  );
}
