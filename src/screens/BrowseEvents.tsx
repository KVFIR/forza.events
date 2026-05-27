import {useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import type {EventType} from '../lib/types';
import {EVENT_TYPES, eventTypeLabel} from '../lib/eventTypes';
import {EventList} from '../components/EventList';
import {EventListMetaSelect} from '../components/EventListMetaSelect';
import {useAuth} from '../context/AuthContext';
import {DISCORD_SUPABASE_PROXY_PREFIX} from '../lib/supabaseEnv';
import {usePublishedEvents} from '../hooks/usePublishedEvents';
import {filterByEventType, sortEvents, type EventSortKey} from '../lib/eventList';

type TypeFilter = EventType | 'all';

export function BrowseEvents() {
  const {t} = useTranslation();
  const {isStandalone} = useAuth();

  const typeOptions: {value: TypeFilter; label: string}[] = [
    {value: 'all', label: t('browse.allTypes')},
    ...EVENT_TYPES.map((et) => ({value: et.value, label: eventTypeLabel(et.value)})),
  ];

  const sortOptions: {value: EventSortKey; label: string}[] = [
    {value: 'event_date', label: t('browse.sortEventDate')},
    {value: 'created', label: t('browse.sortCreated')},
    {value: 'fill', label: t('browse.sortFill')},
  ];
  const {events, isLoading, isRefreshing, loadError, refetch} = usePublishedEvents();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sort, setSort] = useState<EventSortKey>('event_date');

  const filtered = useMemo(() => {
    const byType = filterByEventType(events, typeFilter);
    return sortEvents(byType, sort);
  }, [events, typeFilter, sort]);

  const hasActiveFilters = typeFilter !== 'all';

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
            ? {label: t('common.clearFilters'), onClick: () => setTypeFilter('all')}
            : undefined
        }
        metaRight={
          <>
            <EventListMetaSelect
              value={typeFilter}
              onChange={setTypeFilter}
              options={typeOptions}
              aria-label={t('browse.filterByType')}
            />
            <span className="text-[11px] text-muted/35" aria-hidden>
              ·
            </span>
            <span className="shrink-0 text-[11px] font-medium text-muted">
              {t('common.sortBy')}
            </span>
            <EventListMetaSelect
              value={sort}
              onChange={setSort}
              options={sortOptions}
              aria-label={t('browse.sortEvents')}
            />
          </>
        }
      />
    </div>
  );
}
