import {useState} from 'react';
import {Link} from 'react-router-dom';
import {useAuth} from '../context/AuthContext';
import {useJoinedEvents} from '../context/JoinedEventsContext';
import {isApiConfigured, updateProfile} from '../lib/api';
import {GamertagModal} from '../components/GamertagModal';
import {EventCard} from '../components/EventCard';
import {useMyEventsCatalog} from '../hooks/useMyEventsCatalog';
import {cn} from '../lib/cn';

function StatPill({label, value}: {label: string; value: string | number}) {
  return (
    <div className="flex flex-1 flex-col gap-0.5 rounded-xl border border-white/[0.07] bg-card px-3 py-2.5 text-center">
      <span className="text-lg font-black tabular-nums text-white">{value}</span>
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{label}</span>
    </div>
  );
}

export function Profile() {
  const {user, refreshUser, getAccessToken, isConfigured, isSignedIn, signIn} = useAuth();
  const {isJoined} = useJoinedEvents();
  const {allMine, active, completed, loading} = useMyEventsCatalog('all');
  const [editGamertag, setEditGamertag] = useState(false);
  const [saving, setSaving] = useState(false);
  const initial = user.username.charAt(0).toUpperCase();
  const token = getAccessToken();
  const needsGamertag = !user.xboxGamertag?.trim();
  const recentCompleted = completed.slice(0, 3);
  const hostedCount = allMine.filter((e) => e.hostDiscordId === user.discordId).length;
  const participatedCount = allMine.filter((e) => isJoined(e)).length;

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
    <div className="pb-10 pt-5 animate-fade-in">
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
            <button
              type="button"
              onClick={() => setEditGamertag(true)}
              className="mt-2 text-xs font-semibold text-accent-purple hover:text-accent-purple-light"
            >
              {user.xboxGamertag ? 'Edit gamertag' : 'Add gamertag'}
            </button>
          </div>
        </div>
      </div>

      {needsGamertag && (
        <p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/90">
          Add your Xbox gamertag before joining events on Browse.
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <StatPill label="Hosted" value={loading ? 0 : hostedCount} />
        <StatPill label="Participated" value={loading ? 0 : participatedCount} />
        <StatPill label="Rating" value="TBD" />
      </div>

      {recentCompleted.length > 0 && (
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-[11px] font-medium text-muted">Recent results</p>
            <Link
              to="/my-events"
              className="text-[11px] font-semibold text-accent-purple hover:text-accent-purple-light"
            >
              All in My Events
            </Link>
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

      {!loading && active.length > 0 && (
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
      {isConfigured && !isSignedIn && (
        <p className="mt-6 text-center text-[10px] text-muted">
          <button
            type="button"
            onClick={signIn}
            className="font-semibold text-accent-purple-light hover:underline"
          >
            Sign in with Discord
          </button>{' '}
          to sync your profile.
        </p>
      )}

      <GamertagModal
        open={editGamertag}
        initialValue={user.xboxGamertag ?? ''}
        saving={saving}
        onSave={handleSaveGamertag}
        onClose={() => setEditGamertag(false)}
      />
    </div>
  );
}
