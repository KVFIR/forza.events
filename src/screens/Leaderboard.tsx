import {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {EmptyState} from '../components/ui/EmptyState';
import {PageLoading} from '../components/ui/PageLoading';
import {Panel} from '../components/ui/Panel';
import {TextLink} from '../components/ui/TextButton';
import {UserAvatar} from '../components/UserAvatar';
import {ContentReveal} from '../components/ui/ContentReveal';
import {useAuth} from '../context/AuthContext';
import {
  fetchLeaderboard,
  isApiConfigured,
  type LeaderboardEntry,
  type LeaderboardLastRace,
  type LeaderboardViewer,
} from '../lib/api';
import {formatEventStart} from '../lib/datetime';
import {eventDetailPath} from '@edge/eventPath.ts';
import {formatDiscordHandle} from '../lib/discordHandle';
import {cn} from '../lib/cn';
import {sectionLabelClass} from '../components/ui/formStyles';

function driverLabel(
  row: {gamertag: string | null; username: string | null},
  dash: string,
): string {
  return row.gamertag?.trim() || (row.username ? formatDiscordHandle(row.username) : dash);
}

function RatingValue({rating, className}: {rating: number; className?: string}) {
  return <span className={cn('tabular-nums', className)}>{rating}</span>;
}

function RatingDelta({
  delta,
  dash,
  className,
}: {
  delta: number | null | undefined;
  dash: string;
  className?: string;
}) {
  if (delta == null) {
    return <span className={cn('text-muted', className)}>{dash}</span>;
  }
  const signed = delta > 0 ? `+${delta}` : String(delta);
  return (
    <span
      className={cn(
        'tabular-nums',
        delta > 0 ? 'text-accent-green' : delta < 0 ? 'text-red-300/90' : 'text-muted',
        className,
      )}
    >
      {signed}
    </span>
  );
}

function LastRaceLink({
  race,
  dash,
  className,
}: {
  race: LeaderboardLastRace | null | undefined;
  dash: string;
  className?: string;
}) {
  if (!race) {
    return <span className="text-muted">{dash}</span>;
  }
  return (
    <TextLink
      to={eventDetailPath({id: race.eventId, slug: race.slug})}
      tone="subtle"
      className={cn('block min-w-0 truncate text-sm', className)}
    >
      {race.title}
    </TextLink>
  );
}

function StatusPlate({
  viewer,
  user,
  dash,
}: {
  viewer: LeaderboardViewer | null;
  user: {username: string; avatarUrl?: string; xboxGamertag?: string};
  dash: string;
}) {
  const {t} = useTranslation();
  const name = user.xboxGamertag?.trim() || formatDiscordHandle(user.username);
  const handle = user.xboxGamertag?.trim() ? formatDiscordHandle(user.username) : null;
  const rated = viewer && viewer.gamesRated > 0;

  return (
    <Panel className="overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <UserAvatar src={user.avatarUrl} name={name} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{name}</p>
          {handle ? (
            <p className="truncate text-xs text-muted">{handle}</p>
          ) : null}
        </div>
        <dl className="flex shrink-0 gap-4 sm:gap-5">
          <div className="text-right">
            <dt className={sectionLabelClass}>{t('leaderboard.statRank')}</dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-white">
              {rated ? viewer.rank : dash}
            </dd>
          </div>
          <div className="text-right">
            <dt className={sectionLabelClass}>{t('leaderboard.statRating')}</dt>
            <dd className="mt-0.5 text-sm font-semibold text-accent-purple-light">
              {rated ? <RatingValue rating={viewer.rating} /> : dash}
            </dd>
          </div>
          <div className="text-right">
            <dt className={sectionLabelClass}>{t('leaderboard.statRaces')}</dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-white">
              {viewer?.gamesRated ?? 0}
            </dd>
          </div>
        </dl>
      </div>
    </Panel>
  );
}

function ViewerRaces({races, dash}: {races: LeaderboardLastRace[]; dash: string}) {
  const {t} = useTranslation();
  if (races.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className={cn(sectionLabelClass, 'mb-2')}>{t('leaderboard.yourRaces')}</h2>
      <Panel className="overflow-hidden">
        <ol className="divide-y divide-white/[0.05]">
          {races.map((race) => (
            <li
              key={`${race.eventId}-${race.startsAt}`}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-2.5"
            >
              <div className="min-w-0">
                <LastRaceLink
                  race={race}
                  dash={dash}
                  className="text-white hover:text-accent-purple-light"
                />
                {race.startsAt ? (
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {formatEventStart(race.startsAt)}
                  </p>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                {race.ratingAfter != null ? (
                  <p className="text-sm font-semibold tabular-nums text-white">{race.ratingAfter}</p>
                ) : null}
                <RatingDelta
                  delta={race.delta}
                  dash={dash}
                  className={race.ratingAfter != null ? 'mt-0.5 block text-xs' : undefined}
                />
              </div>
            </li>
          ))}
        </ol>
      </Panel>
    </section>
  );
}

function LadderTable({
  entries,
  viewerId,
  dash,
}: {
  entries: LeaderboardEntry[];
  viewerId: string;
  dash: string;
}) {
  const {t} = useTranslation();

  return (
    <Panel className="overflow-x-auto">
      <table className="w-full table-fixed border-collapse text-left text-sm">
        <caption className="sr-only">{t('leaderboard.tableCaption')}</caption>
        <colgroup>
          <col className="w-12" />
          <col className="w-9" />
          <col />
          <col className="w-16" />
          <col className="w-20" />
          <col className="hidden w-[32%] sm:table-column" />
        </colgroup>
        <thead>
          <tr className="border-b border-white/[0.05]">
            <th scope="col" className={cn(sectionLabelClass, 'px-3 py-2.5 font-bold sm:px-4')}>
              {t('leaderboard.colRank')}
            </th>
            <th scope="col" className={cn(sectionLabelClass, 'px-1 py-2.5 font-bold')}>
              <span className="sr-only">{t('leaderboard.colDriver')}</span>
            </th>
            <th scope="col" className={cn(sectionLabelClass, 'px-2 py-2.5 font-bold')}>
              {t('leaderboard.colDriver')}
            </th>
            <th
              scope="col"
              className={cn(sectionLabelClass, 'px-2 py-2.5 text-right font-bold')}
            >
              {t('leaderboard.colRating')}
            </th>
            <th
              scope="col"
              className={cn(sectionLabelClass, 'px-2 py-2.5 text-right font-bold')}
            >
              {t('leaderboard.colDelta')}
            </th>
            <th
              scope="col"
              className={cn(
                sectionLabelClass,
                'hidden px-3 py-2.5 font-bold sm:table-cell',
              )}
            >
              {t('leaderboard.colLastRace')}
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((row) => {
            const isViewer = Boolean(viewerId && row.discordId === viewerId);
            const name = driverLabel(row, dash);
            return (
              <tr
                key={row.discordId}
                className={cn(
                  'border-b border-white/[0.05] last:border-b-0',
                  isViewer ? 'bg-accent-purple/10' : 'hover:bg-white/[0.03]',
                )}
              >
                <th
                  scope="row"
                  className={cn(
                    'px-3 py-2.5 text-sm font-black tabular-nums sm:px-4',
                    isViewer ? 'text-accent-purple-light' : 'text-slate-300',
                  )}
                >
                  {row.rank}
                </th>
                <td className="px-1 py-2.5">
                  <UserAvatar src={row.avatarUrl} name={name} size="sm" />
                </td>
                <td className="min-w-0 px-2 py-2.5">
                  <span
                    className={cn(
                      'block truncate font-medium',
                      isViewer ? 'text-white' : 'text-slate-200',
                    )}
                  >
                    {name}
                  </span>
                  <span className="mt-0.5 block min-w-0 sm:hidden">
                    <LastRaceLink race={row.lastRace} dash={dash} />
                  </span>
                </td>
                <td className="px-2 py-2.5 text-right">
                  <RatingValue
                    rating={row.rating}
                    className={cn(
                      'justify-end text-sm font-bold',
                      isViewer ? 'text-accent-purple-light' : 'text-slate-200',
                    )}
                  />
                </td>
                <td className="px-2 py-2.5 text-right font-semibold">
                  <RatingDelta delta={row.lastRace?.delta} dash={dash} />
                </td>
                <td className="hidden min-w-0 px-3 py-2.5 sm:table-cell">
                  <LastRaceLink race={row.lastRace} dash={dash} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Panel>
  );
}

export function Leaderboard() {
  const {t} = useTranslation();
  const {getAccessToken, user, isSignedIn} = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [viewer, setViewer] = useState<LeaderboardViewer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const dash = t('common.dash');

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

  const showPlate = isSignedIn;

  return (
    <ContentReveal className="pb-10 pt-4">
      {showPlate ? <StatusPlate viewer={viewer} user={user} dash={dash} /> : null}

      {showPlate ? <ViewerRaces races={viewer?.races ?? []} dash={dash} /> : null}

      {entries.length === 0 ? (
        <EmptyState
          className={showPlate ? 'mt-6' : undefined}
          title={t('leaderboard.emptyTitle')}
          description={t('leaderboard.emptyDesc')}
        />
      ) : (
        <section className={showPlate ? 'mt-6' : undefined}>
          <LadderTable
            entries={entries}
            viewerId={isSignedIn ? user.discordId : ''}
            dash={dash}
          />
        </section>
      )}
    </ContentReveal>
  );
}
