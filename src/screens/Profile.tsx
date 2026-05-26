import {useState} from 'react';
import {TextButton, TextLink} from '../components/ui/TextButton';
import {useAuth} from '../context/AuthContext';
import {useJoinedEvents} from '../context/JoinedEventsContext';
import {isApiConfigured, updateProfile} from '../lib/api';
import {GamertagModal} from '../components/GamertagModal';
import {EventCard} from '../components/EventCard';
import {useMyEventsCatalog} from '../hooks/useMyEventsCatalog';
import {isEventSuccessfullyCompleted} from '../lib/eventSpec';
import {hasGamertag} from '../lib/gamertag';
import {SignInRequiredState} from '../components/SignInRequiredState';
import {ContentReveal} from '../components/ui/ContentReveal';
import {EmptyState} from '../components/ui/EmptyState';
import {PageLoading} from '../components/ui/PageLoading';
import {useLoadingUI} from '../hooks/useLoadingUI';
import {Alert} from '../components/ui/Alert';
import {StatCard} from '../components/ui/StatCard';
import {cn} from '../lib/cn';

export function Profile() {
  const {user, refreshUser, getAccessToken, isConfigured, isSignedIn, isStandalone, authRetrying, retryDiscordAuth} =
    useAuth();
  const {isJoined} = useJoinedEvents();
  const {allMine, active, completed, isLoading, loadError, refetch} = useMyEventsCatalog('all');
  const showLoadingUI = useLoadingUI(isLoading);
  const [editGamertag, setEditGamertag] = useState(false);
  const [saving, setSaving] = useState(false);
  const initial = user.username.charAt(0).toUpperCase();
  const token = getAccessToken();
  const needsGamertag = !hasGamertag(user.xboxGamertag);
  const recentCompleted = completed.slice(0, 3);
  const hostedCount = allMine.filter(
    (e) => e.hostDiscordId === user.discordId && isEventSuccessfullyCompleted(e),
  ).length;
  const participatedCount = allMine.filter(
    (e) => isJoined(e) && isEventSuccessfullyCompleted(e),
  ).length;

  if (isConfigured && !isStandalone && !isSignedIn) {
    return (
      <SignInRequiredState
        description="Connect your Discord account to view your profile and stats."
        busy={authRetrying}
        onRetry={() => void retryDiscordAuth()}
        className="pb-10 pt-5"
      />
    );
  }

  if (showLoadingUI) {
    return <PageLoading label="Loading profile" className="pb-10 pt-5" />;
  }

  if (isLoading) {
    return null;
  }

  if (loadError) {
    return (
      <ContentReveal>
        <EmptyState
          icon="⚠️"
          title="Could not load profile data"
          description="Check your connection and try again."
          action={{label: 'Try again', onClick: refetch}}
          className="min-h-[40vh] py-20"
        />
      </ContentReveal>
    );
  }

  async function handleSaveGamertag(gamertag: string) {
    if (!token || !isApiConfigured()) {
      refreshUser({...user, xboxGamertag: gamertag});
      setEditGamertag(false);
      return;
    }
    setSaving(true);
    try {
      const {user: updated} = await updateProfile(token, {xbox_gamertag: gamertag});
      refreshUser(updated);
      setEditGamertag(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ContentReveal className="pb-10 pt-5">
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-card">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(139,92,246,0.12)_0%,transparent_70%)]" />
        <div className="relative flex items-center gap-4 p-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-purple-dark to-accent-purple-light text-xl font-black text-white shadow-glow-purple-sm">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-black tracking-tight text-white">{user.username}</p>
            <p className="mt-0.5 text-xs text-muted-light">
              Xbox GT:{' '}
              <span className={cn('font-semibold', needsGamertag ? 'text-amber-300' : 'text-slate-300')}>
                {user.xboxGamertag ?? 'Not set'}
              </span>
            </p>
            <TextButton type="button" className="mt-2" onClick={() => setEditGamertag(true)}>
              {user.xboxGamertag ? 'Edit gamertag' : 'Add gamertag'}
            </TextButton>
          </div>
        </div>
      </div>

      {needsGamertag && (
        <Alert variant="warning" className="mt-3">
          Add your Xbox gamertag before joining events on Browse.
        </Alert>
      )}

      <div className="mt-4 flex gap-2">
        <StatCard label="Hosted" value={hostedCount} />
        <StatCard label="Participated" value={participatedCount} />
        <StatCard label="Rating" value="TBD" />
      </div>

      {recentCompleted.length > 0 && (
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium text-muted">Recent results</p>
            <TextLink to="/my-events" className="text-[11px]">
              All in My Events
            </TextLink>
          </div>
          <ul className="flex list-none flex-col gap-2">
            {recentCompleted.map((event) => (
              <li key={event.id}>
                <EventCard event={event} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {active.length > 0 && (
        <section className="mt-6">
          <p className="mb-3 text-[11px] font-medium text-muted">Upcoming for you</p>
          <ul className="flex list-none flex-col gap-2">
            {active.slice(0, 2).map((event) => (
              <li key={event.id}>
                <EventCard event={event} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {!isConfigured && (
        <p className="mt-6 text-center text-[10px] text-muted">
          Configure Supabase in <code>.env</code> to load profile stats from the database.
        </p>
      )}
      <GamertagModal
        open={editGamertag}
        initialValue={user.xboxGamertag ?? ''}
        saving={saving}
        onSave={handleSaveGamertag}
        onClose={() => setEditGamertag(false)}
      />
    </ContentReveal>
  );
}
