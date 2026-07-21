import {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Alert} from '../components/ui/Alert';
import {EmptyState} from '../components/ui/EmptyState';
import {PageLoading} from '../components/ui/PageLoading';
import {Panel} from '../components/ui/Panel';
import {UserAvatar} from '../components/UserAvatar';
import {useAuth} from '../context/AuthContext';
import {fetchLeaderboard, isApiConfigured} from '../lib/api';
import {formatDiscordHandle} from '../lib/discordHandle';
import {cn} from '../lib/cn';
import {panelDividedClass} from '../components/ui/formStyles';

type Entry = {
  rank: number;
  discordId: string;
  username: string | null;
  avatarUrl: string | null;
  gamertag: string | null;
  rating: number;
  gamesRated: number;
  provisional: boolean;
};

export function Leaderboard() {
  const {t} = useTranslation();
  const {getAccessToken, user, isSignedIn} = useAuth();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [viewer, setViewer] = useState<{
    rank: number;
    rating: number;
    gamesRated: number;
    provisional: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    if (!isApiConfigured()) {
      setLoading(false);
      setError(true);
      return;
    }
    setLoading(true);
    setError(false);
    void fetchLeaderboard(getAccessToken())
      .then((r) => {
        setEntries(r.entries);
        setViewer(r.viewer);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on sign-in only
  }, [isSignedIn]);

  if (loading) {
    return <PageLoading label={t('loading.page')} className="pb-10 pt-4" />;
  }

  if (error) {
    return (
      <EmptyState
        title={t('leaderboard.loadErrorTitle')}
        description={t('leaderboard.loadErrorDesc')}
        action={{label: t('common.tryAgain'), onClick: load}}
      />
    );
  }

  return (
    <div className="pb-10 pt-4">
      {viewer && viewer.rank > 0 ? (
        <Alert variant="info" className="mb-4 py-2.5 text-sm">
          {t('leaderboard.yourRank', {
            rank: viewer.rank,
            rating: viewer.rating,
          })}
          {viewer.provisional ? ` · ${t('leaderboard.provisional')}` : ''}
        </Alert>
      ) : null}

      {entries.length === 0 ? (
        <EmptyState
          title={t('leaderboard.emptyTitle')}
          description={t('leaderboard.emptyDesc')}
        />
      ) : (
        <Panel className="overflow-hidden">
          <ol className={panelDividedClass}>
            {entries.map((row) => {
              const isViewer = isSignedIn && row.discordId === user.discordId;
              return (
                <li
                  key={row.discordId}
                  className={cn(
                    'grid grid-cols-[2.5rem_2rem_1fr_auto] items-center gap-x-3 px-4 py-2.5',
                    isViewer && 'bg-accent-purple/10',
                  )}
                >
                  <span className="text-sm font-black tabular-nums text-slate-300">
                    {row.rank}
                  </span>
                  <UserAvatar
                    src={row.avatarUrl ?? undefined}
                    name={row.gamertag || row.username || '?'}
                    size="sm"
                  />
                  <span className="min-w-0 truncate">
                    <span
                      className={cn(
                        'block truncate text-sm font-medium',
                        isViewer ? 'text-white' : 'text-slate-200',
                      )}
                    >
                      {row.gamertag?.trim() ||
                        (row.username ? formatDiscordHandle(row.username) : t('common.dash'))}
                    </span>
                    {row.provisional ? (
                      <span className="text-[10px] uppercase tracking-widest text-muted">
                        {t('leaderboard.provisional')}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      'text-sm font-bold tabular-nums',
                      isViewer ? 'text-accent-purple-light' : 'text-slate-200',
                    )}
                  >
                    {row.rating}
                  </span>
                </li>
              );
            })}
          </ol>
        </Panel>
      )}
    </div>
  );
}
