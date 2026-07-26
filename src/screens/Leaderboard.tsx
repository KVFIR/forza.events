import {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Asterisk} from 'lucide-react';
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

function ProvisionalMark({label}: {label: string}) {
  return (
    <span className="inline-flex" title={label} role="img" aria-label={label}>
      <Asterisk className="h-3 w-3 shrink-0 text-muted" aria-hidden />
    </span>
  );
}

function RatingValue({
  rating,
  provisional,
  provisionalLabel,
  className,
}: {
  rating: number;
  provisional: boolean;
  provisionalLabel: string;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-1 tabular-nums', className)}>
      {provisional ? <ProvisionalMark label={provisionalLabel} /> : null}
      {rating}
    </span>
  );
}

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
  const provisionalLabel = t('leaderboard.provisional');

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
      <header className="mb-4">
        <p className="text-sm text-muted">{t('leaderboard.subtitle')}</p>
      </header>

      {viewer && viewer.rank > 0 ? (
        <Alert variant="info" className="mb-4 py-2.5 text-sm">
          {t('leaderboard.yourRank', {rank: viewer.rank})}{' '}
          <RatingValue
            rating={viewer.rating}
            provisional={viewer.provisional}
            provisionalLabel={provisionalLabel}
            className="font-semibold"
          />
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
                  <span
                    className={cn(
                      'min-w-0 truncate text-sm font-medium',
                      isViewer ? 'text-white' : 'text-slate-200',
                    )}
                  >
                    {row.gamertag?.trim() ||
                      (row.username ? formatDiscordHandle(row.username) : t('common.dash'))}
                  </span>
                  <RatingValue
                    rating={row.rating}
                    provisional={row.provisional}
                    provisionalLabel={provisionalLabel}
                    className={cn(
                      'text-sm font-bold',
                      isViewer ? 'text-accent-purple-light' : 'text-slate-200',
                    )}
                  />
                </li>
              );
            })}
          </ol>
        </Panel>
      )}
    </div>
  );
}
