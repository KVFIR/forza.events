import {useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {useNavigate} from 'react-router-dom';
import {Alert} from '../components/ui/Alert';
import {EventList} from '../components/EventList';
import {EventListFilterChips} from '../components/EventListFilterChips';
import {useAuth} from '../context/AuthContext';
import {useJoinedEvents} from '../context/JoinedEventsContext';
import {useMyEventsCatalog} from '../hooks/useMyEventsCatalog';
import {useParticipantResults} from '../hooks/useParticipantResults';
import {EVENT_GAMES, eventGameLabel, type ForzaGame} from '../lib/eventGames';
import {filterByGame, type MyEventsScope} from '../lib/eventList';
import {isEventSuccessfullyCompleted} from '../lib/eventSpec';

type GameFilter = ForzaGame | 'all';

export function MyEvents() {
  const {t} = useTranslation();
  const navigate = useNavigate();

  const scopeOptions = useMemo(
    () => [
      {value: 'all' as const, label: t('myEvents.scopeAll')},
      {value: 'hosted' as const, label: t('myEvents.scopeHosted')},
      {value: 'joined' as const, label: t('myEvents.scopeJoined')},
    ],
    [t],
  );

  const gameOptions = useMemo(
    () => [
      {value: 'all' as const, label: t('browse.filterAll')},
      ...EVENT_GAMES.map((g) => ({
        value: g.value,
        label: eventGameLabel(g.value),
        selectedClassName: g.chipSelected,
      })),
    ],
    [t],
  );

  const [scope, setScope] = useState<MyEventsScope>('all');
  const [gameFilter, setGameFilter] = useState<GameFilter>('all');
  const {isSignedIn, loading: authLoading, user} = useAuth();
  const {isJoined} = useJoinedEvents();
  const {filtered: scoped, isLoading, isRefreshing, loadError, draftsLoadError, refetch} =
    useMyEventsCatalog(scope);

  const filtered = useMemo(
    () => filterByGame(scoped, gameFilter),
    [scoped, gameFilter],
  );

  const placementEventIds = useMemo(
    () =>
      filtered
        .filter((e) => isEventSuccessfullyCompleted(e) && isJoined(e))
        .map((e) => e.id),
    [filtered, isJoined],
  );
  const participantResults = useParticipantResults(placementEventIds, user.discordId);

  const hasActiveFilters = scope !== 'all' || gameFilter !== 'all';

  const clearFilters = () => {
    setScope('all');
    setGameFilter('all');
  };

  const emptyTitle =
    !authLoading && !isSignedIn
      ? t('myEvents.unableToLoad')
      : loadError
        ? t('myEvents.loadError')
        : scope === 'joined'
          ? t('myEvents.noJoined')
          : t('myEvents.emptyList');

  const emptyDescription =
    !authLoading && !isSignedIn
      ? t('auth.openInDiscordMyEvents')
      : loadError
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
        filters={
          <>
            <EventListFilterChips
              label={t('myEvents.filterScope')}
              value={scope}
              onChange={setScope}
              options={scopeOptions}
              aria-label={t('myEvents.filterAria')}
            />
            <EventListFilterChips
              label={t('browse.filterGame')}
              value={gameFilter}
              onChange={setGameFilter}
              options={gameOptions}
              aria-label={t('browse.filterByGame')}
            />
          </>
        }
      />
    </div>
  );
}
