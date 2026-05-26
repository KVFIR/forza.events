import {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {EventList} from '../components/EventList';
import {EventListMetaSelect} from '../components/EventListMetaSelect';
import {useAuth} from '../context/AuthContext';
import {useMyEventsCatalog} from '../hooks/useMyEventsCatalog';
import type {MyEventsScope} from '../lib/eventList';

const scopeOptions: {value: MyEventsScope; label: string}[] = [
  {value: 'all', label: 'All'},
  {value: 'hosted', label: 'Hosted'},
  {value: 'joined', label: 'Joined'},
];

export function MyEvents() {
  const navigate = useNavigate();
  const [scope, setScope] = useState<MyEventsScope>('all');
  const {isSignedIn, loading: authLoading} = useAuth();
  const {filtered, isLoading, isRefreshing, loadError, refetch} = useMyEventsCatalog(scope);

  const emptyTitle =
    !authLoading && !isSignedIn
      ? 'Unable to load your events'
      : loadError
        ? 'Could not load your events'
        : scope === 'joined'
          ? 'No joined events yet'
          : 'No events in this list yet';

  const emptyDescription =
    !authLoading && !isSignedIn
      ? 'Open this app in Discord to see events you host or join.'
      : loadError
        ? 'Check your connection and try again.'
        : scope !== 'joined' && isSignedIn
          ? 'Saved drafts and published events you host appear here.'
          : undefined;

  return (
    <div className="pb-8 pt-5">
      <EventList
        events={filtered}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        loadError={loadError}
        onRetry={refetch}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        emptyAction={
          scope === 'joined'
            ? undefined
            : scope !== 'all'
              ? {label: 'Clear filters', onClick: () => setScope('all')}
              : !loadError && isSignedIn
                ? {label: 'Create event', onClick: () => navigate('/create')}
                : undefined
        }
        metaRight={
          <EventListMetaSelect
            value={scope}
            onChange={setScope}
            options={scopeOptions}
            aria-label="Filter my events"
          />
        }
      />
    </div>
  );
}
