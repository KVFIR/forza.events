import {useMemo, useState} from 'react';
import type {EventType} from '../lib/types';
import {EventList} from '../components/EventList';
import {EventListMetaSelect} from '../components/EventListMetaSelect';
import {useAuth} from '../context/AuthContext';
import {discordSupabaseProxyPrefix} from '../lib/discordUrlProxy';
import {usePublishedEvents} from '../hooks/usePublishedEvents';
import {filterByEventType, sortEvents, type EventSortKey} from '../lib/eventList';

type TypeFilter = EventType | 'all';

const typeOptions: {value: TypeFilter; label: string}[] = [
  {value: 'all', label: 'All types'},
  {value: 'road', label: 'Road'},
  {value: 'dirt', label: 'Dirt'},
  {value: 'drift', label: 'Drift'},
  {value: 'touge', label: 'Touge'},
];

const sortOptions: {value: EventSortKey; label: string}[] = [
  {value: 'event_date', label: 'Event date'},
  {value: 'created', label: 'Created'},
  {value: 'fill', label: 'Fill'},
];

export function BrowseEvents() {
  const {isStandalone} = useAuth();
  const {events, loading, loadError} = usePublishedEvents();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sort, setSort] = useState<EventSortKey>('event_date');

  const filtered = useMemo(() => {
    const byType = filterByEventType(events, typeFilter);
    return sortEvents(byType, sort);
  }, [events, typeFilter, sort]);

  const hasActiveFilters = typeFilter !== 'all';

  const emptyTitle = loadError
    ? loadError === 'not_configured'
      ? 'App is missing Supabase configuration'
      : isStandalone
        ? 'Could not load events from the database'
        : `Could not reach the database. In Discord Developer Portal add URL mapping ${discordSupabaseProxyPrefix} → your-project.supabase.co`
    : 'No events match these filters';

  return (
    <div className="pb-8 pt-5">
      <EventList
        events={filtered}
        loading={loading}
        emptyTitle={emptyTitle}
        emptyAction={
          hasActiveFilters ? {label: 'Clear filters', onClick: () => setTypeFilter('all')} : undefined
        }
        metaRight={
          <>
            <EventListMetaSelect
              value={typeFilter}
              onChange={setTypeFilter}
              options={typeOptions}
              aria-label="Filter by event type"
            />
            <span className="text-[11px] text-muted/35" aria-hidden>
              ·
            </span>
            <span className="shrink-0 text-[11px] font-medium text-muted">sort by</span>
            <EventListMetaSelect
              value={sort}
              onChange={setSort}
              options={sortOptions}
              aria-label="Sort events"
            />
          </>
        }
      />
    </div>
  );
}
