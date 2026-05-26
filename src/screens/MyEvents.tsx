import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {useNavigate} from 'react-router-dom';
import {Alert} from '../components/ui/Alert';
import {EventList} from '../components/EventList';
import {EventListMetaSelect} from '../components/EventListMetaSelect';
import {useAuth} from '../context/AuthContext';
import {useMyEventsCatalog} from '../hooks/useMyEventsCatalog';
import type {MyEventsScope} from '../lib/eventList';

export function MyEvents() {
  const {t} = useTranslation();
  const navigate = useNavigate();

  const scopeOptions: {value: MyEventsScope; label: string}[] = [
    {value: 'all', label: t('myEvents.scopeAll')},
    {value: 'hosted', label: t('myEvents.scopeHosted')},
    {value: 'joined', label: t('myEvents.scopeJoined')},
  ];
  const [scope, setScope] = useState<MyEventsScope>('all');
  const {isSignedIn, loading: authLoading} = useAuth();
  const {filtered, isLoading, isRefreshing, loadError, draftsLoadError, refetch} =
    useMyEventsCatalog(scope);

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
          scope === 'joined'
            ? undefined
            : scope !== 'all'
              ? {label: t('common.clearFilters'), onClick: () => setScope('all')}
              : !loadError && isSignedIn
                ? {label: t('myEvents.createEvent'), onClick: () => navigate('/create')}
                : undefined
        }
        metaRight={
          <EventListMetaSelect
            value={scope}
            onChange={setScope}
            options={scopeOptions}
            aria-label={t('myEvents.filterAria')}
          />
        }
      />
    </div>
  );
}
