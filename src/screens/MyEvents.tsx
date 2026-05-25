import {useState} from 'react';
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
  const [scope, setScope] = useState<MyEventsScope>('all');
  const {isSignedIn, loading: authLoading} = useAuth();
  const {filtered, loading} = useMyEventsCatalog(scope);

  const emptyTitle =
    !authLoading && !isSignedIn
      ? 'Sign in to see events you host or join'
      : 'No events in this list yet';

  return (
    <div className="pb-8 pt-5">
      <EventList
        events={filtered}
        loading={loading}
        emptyTitle={emptyTitle}
        emptyAction={
          scope !== 'all'
            ? {label: 'Clear filters', onClick: () => setScope('all')}
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
