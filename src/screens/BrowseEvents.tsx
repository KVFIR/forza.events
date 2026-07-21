import {useMemo, useState, useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import type {EventType} from '../lib/types';
import {trackOncePerSession} from '../lib/analytics';
import {EVENT_TYPES, eventTypeLabel, eventTypeMeta} from '../lib/eventTypes';
import {EVENT_GAMES, eventGameLabel, type ForzaGame} from '../lib/eventGames';
import {EventList} from '../components/EventList';
import {EventListFilterChips} from '../components/EventListFilterChips';
import {EventListMetaSelect} from '../components/EventListMetaSelect';
import {useAuth} from '../context/AuthContext';
import {DISCORD_SUPABASE_PROXY_PREFIX} from '../lib/supabaseEnv';
import {usePublishedEvents} from '../hooks/usePublishedEvents';
import {filterByEventType, filterByGame, filterByRanked, sortEvents, type EventSortKey, type RankedFilter} from '../lib/eventList';

type TypeFilter = EventType | 'all';
type GameFilter = ForzaGame | 'all';

export function BrowseEvents() {
  const {t} = useTranslation();
  const {isStandalone} = useAuth();

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

  const typeOptions = useMemo(
    () => [
      {value: 'all' as const, label: t('browse.filterAll')},
      ...EVENT_TYPES.map((et) => {
        const meta = eventTypeMeta(et.value);
        return {
          value: et.value,
          label: eventTypeLabel(et.value),
          selectedClassName: `${meta.badge.border} ${meta.badge.bg} ${meta.badge.text}`,
        };
      }),
    ],
    [t],
  );

  const rankedOptions = useMemo(
    () => [
      {value: 'all' as const, label: t('browse.filterAll')},
      {value: 'ranked' as const, label: t('browse.filterRanked')},
    ],
    [t],
  );

  const sortOptions: {value: EventSortKey; label: string}[] = [
    {value: 'event_date', label: t('browse.sortEventDate')},
    {value: 'created', label: t('browse.sortCreated')},
    {value: 'fill', label: t('browse.sortFill')},
  ];

  const {events, isLoading, isRefreshing, loadError, refetch} = usePublishedEvents();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [gameFilter, setGameFilter] = useState<GameFilter>('all');
  const [rankedFilter, setRankedFilter] = useState<RankedFilter>('all');
  const [sort, setSort] = useState<EventSortKey>('event_date');

  useEffect(() => {
    trackOncePerSession('browse_view');
  }, []);

  const filtered = useMemo(() => {
    const byType = filterByEventType(events, typeFilter);
    const byGame = filterByGame(byType, gameFilter);
    const byRanked = filterByRanked(byGame, rankedFilter);
    return sortEvents(byRanked, sort);
  }, [events, typeFilter, gameFilter, rankedFilter, sort]);

  const hasActiveFilters =
    typeFilter !== 'all' || gameFilter !== 'all' || rankedFilter !== 'all';

  const clearFilters = () => {
    setTypeFilter('all');
    setGameFilter('all');
    setRankedFilter('all');
  };

  const errorTitle =
    loadError === 'not_configured'
      ? t('browse.errorNotConfiguredTitle')
      : isStandalone
        ? t('browse.errorStandaloneTitle')
        : t('browse.errorDiscordTitle');

  const errorDescription =
    loadError === 'not_configured'
      ? t('browse.errorNotConfiguredDesc')
      : isStandalone
        ? t('browse.errorStandaloneDesc')
        : t('browse.errorDiscordDesc', {prefix: DISCORD_SUPABASE_PROXY_PREFIX});

  const emptyTitle = t('browse.noMatch');

  return (
    <div className="pb-8 pt-5">
      <EventList
        events={filtered}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        loadError={loadError}
        onRetry={refetch}
        emptyTitle={loadError ? errorTitle : emptyTitle}
        emptyDescription={loadError ? errorDescription : undefined}
        emptyAction={
          !loadError && hasActiveFilters
            ? {label: t('common.clearFilters'), onClick: clearFilters}
            : undefined
        }
        sortControl={
          <EventListMetaSelect
            value={sort}
            onChange={setSort}
            options={sortOptions}
            aria-label={t('browse.sortEvents')}
          />
        }
        filters={
          <>
            <EventListFilterChips
              label={t('browse.filterGame')}
              value={gameFilter}
              onChange={setGameFilter}
              options={gameOptions}
              aria-label={t('browse.filterByGame')}
            />
            <EventListFilterChips
              label={t('browse.filterType')}
              value={typeFilter}
              onChange={setTypeFilter}
              options={typeOptions}
              aria-label={t('browse.filterByType')}
            />
            <EventListFilterChips
              label={t('browse.filterRanked')}
              value={rankedFilter}
              onChange={setRankedFilter}
              options={rankedOptions}
              aria-label={t('browse.filterByRanked')}
            />
          </>
        }
      />
    </div>
  );
}
