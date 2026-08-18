import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {busyLabel} from '../i18n/busyLabels';
import {useNavigate, useParams, useLocation} from 'react-router-dom';
import {ArrowLeft, ChevronDown, ChevronUp, X} from 'lucide-react';
import {useAuth} from '../context/AuthContext';
import {useRichPresenceOverride} from '../context/DiscordRichPresenceContext';
import {useJoinedEvents} from '../context/JoinedEventsContext';
import {buildResultsRichPresence} from '../lib/discordRichPresence';
import {mergeOptimisticEventPatch} from '../lib/eventParticipation';
import type {EventParticipant, ForzaEvent} from '../lib/types';
import {
  ApiRequestError,
  isApiConfigured,
  listGuildMembers,
  submitEventResults,
} from '../lib/api';
import {track} from '../lib/analytics';
import {API_ERROR_CODES} from '../lib/apiErrorCodes';
import {formatDiscordHandle} from '../lib/discordHandle';
import {buildResultSubmitRows} from '../lib/eventResults';
import {resolveResultsRoster} from '../lib/eventRoster';
import {fetchEventById, fetchEventResults} from '../lib/events';
import {eventDetailPath} from '@edge/eventPath.ts';
import {usePageMetaOverride} from '../context/PageMetaContext';
import {buildEventPageMeta} from '../lib/eventPageMeta';
import {
  savedCountFromResultsFetch,
  shouldLeaveResultsScreen,
} from '../lib/eventResultsScreen';
import {
  buildEventDetailLocationState,
  buildEventDetailNavigateStateAfterSubmit,
  type EventResultsLocationState,
} from '../lib/navigationState';
import {
  addResultsDriver,
  initResultsEntry,
  isResultsEntryComplete,
  moveOrderedDriver,
  orderedDriversInScope,
  placeDriver,
  placementsForSubmit,
  poolDriversInScope,
  removeResultsDriver,
  setDriverOutcome,
  setResultsRankingMode,
  unplaceDriver,
  type ResultsEntryDriver,
  type ResultsEntryState,
} from '../lib/resultsEntry';
import {Alert} from '../components/ui/Alert';
import {Button} from '../components/ui/Button';
import {Panel} from '../components/ui/Panel';
import {UserAvatar} from '../components/UserAvatar';
import {TextButton, TextLink} from '../components/ui/TextButton';
import {ConfirmDialog} from '../components/ui/ConfirmDialog';
import {ContentReveal} from '../components/ui/ContentReveal';
import {PageLoading} from '../components/ui/PageLoading';
import {SegmentGroup} from '../components/ui/SegmentGroup';
import {Input} from '../components/ui/Input';
import {sectionLabelClass} from '../components/ui/formStyles';
import {useLoadingUI} from '../hooks/useLoadingUI';
import {cn} from '../lib/cn';

function toEntryDrivers(
  participants: EventParticipant[],
): ResultsEntryDriver[] {
  return participants.map((p) => ({
    discordId: p.discordId,
    label: p.gamertag ?? p.username,
    avatarUrl: p.avatarUrl,
    groupIndex: p.groupIndex ?? 1,
    username: p.username,
    gamertag: p.gamertag,
  }));
}

type GuestPick = {
  discordId: string;
  username: string;
  gamertag: string | null;
  avatarUrl?: string;
};

function ResultsGuestSearch({
  accessToken,
  guildId,
  excludeDiscordIds,
  waitlist,
  onPick,
}: {
  accessToken: string;
  guildId: string | undefined;
  excludeDiscordIds: readonly string[];
  waitlist: GuestPick[];
  onPick: (member: GuestPick) => void;
}) {
  const {t} = useTranslation();
  const excluded = useMemo(
    () => new Set(excludeDiscordIds),
    [excludeDiscordIds],
  );
  const waitlistHits = waitlist.filter((p) => !excluded.has(p.discordId));
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<GuestPick[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchSerialRef = useRef(0);

  useEffect(() => {
    setQuery('');
    setHits([]);
    setSearchError(null);
  }, [guildId]);

  useEffect(() => {
    if (!guildId || query.trim().length < 2) {
      setHits([]);
      setSearchError(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const serial = ++searchSerialRef.current;
      setSearching(true);
      setSearchError(null);
      void listGuildMembers(accessToken, guildId, query.trim())
        .then((res) => {
          if (serial !== searchSerialRef.current) return;
          setHits(
            res.members
              .filter((m) => !excluded.has(m.discord_id))
              .map((m) => ({
                discordId: m.discord_id,
                username: m.username,
                gamertag: m.xbox_gamertag,
                avatarUrl: m.avatar_url ?? undefined,
              })),
          );
        })
        .catch((e) => {
          if (serial !== searchSerialRef.current) return;
          setHits([]);
          setSearchError(
            e instanceof ApiRequestError || e instanceof Error
              ? e.message
              : String(e),
          );
        })
        .finally(() => {
          if (serial === searchSerialRef.current) setSearching(false);
        });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [accessToken, guildId, query, excluded]);

  const pick = (member: GuestPick) => {
    onPick(member);
    setQuery('');
    setHits([]);
  };

  if (!guildId && waitlistHits.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className={sectionLabelClass}>{t('results.addFromServer')}</p>
      <p className="text-xs text-muted">{t('results.addFromServerHint')}</p>
      {waitlistHits.length > 0 ? (
        <>
          <p className="text-xs text-muted">{t('eventDetail.waitlist')}</p>
          <ul
            className="max-h-40 overflow-y-auto rounded-lg border border-white/[0.08] bg-card"
            role="listbox"
          >
            {waitlistHits.map((m) => (
              <li key={m.discordId}>
                <button
                  type="button"
                  role="option"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/[0.06]"
                  onClick={() => pick(m)}
                >
                  <UserAvatar
                    src={m.avatarUrl}
                    name={m.gamertag || m.username}
                    size="sm"
                    variant="neutral"
                  />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium">
                      {m.gamertag || formatDiscordHandle(m.username)}
                    </span>
                    {m.gamertag ? (
                      <span className="ml-1 text-xs text-muted">
                        {formatDiscordHandle(m.username)}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {guildId ? (
        <>
          <Input
            placeholder={t('create.convoyLeaderSearchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
          {searchError ? <Alert variant="warning">{searchError}</Alert> : null}
          {searching ? (
            <p className="text-xs text-muted">
              {t('create.convoyLeaderSearching')}
            </p>
          ) : null}
          {!searching &&
          query.trim().length >= 2 &&
          hits.length === 0 &&
          !searchError ? (
            <p className="text-xs text-muted">
              {t('create.convoyLeaderNoResults')}
            </p>
          ) : null}
          {hits.length > 0 ? (
            <ul
              className="max-h-40 overflow-y-auto rounded-lg border border-white/[0.08] bg-card"
              role="listbox"
            >
              {hits.map((m) => (
                <li key={m.discordId}>
                  <button
                    type="button"
                    role="option"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/[0.06]"
                    onClick={() => pick(m)}
                  >
                    <UserAvatar
                      src={m.avatarUrl}
                      name={m.username}
                      size="sm"
                      variant="neutral"
                    />
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-medium">
                        {formatDiscordHandle(m.username)}
                      </span>
                      {m.gamertag ? (
                        <span className="ml-1 text-xs text-muted">
                          {m.gamertag}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function OutcomeChips({
  dnf,
  dns,
  onDnf,
  onDns,
}: {
  dnf: boolean;
  dns: boolean;
  onDnf: () => void;
  onDns: () => void;
}) {
  const {t} = useTranslation();
  return (
    <div className="flex shrink-0 gap-1">
      <Button
        type="button"
        variant="ghost"
        size="compact"
        className={cn(
          'h-7 px-2 text-[10px] font-bold uppercase tracking-wider',
          dnf ? 'bg-white/10 text-white' : 'text-muted hover:text-white',
        )}
        aria-pressed={dnf}
        onClick={onDnf}
      >
        {t('results.dnf')}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="compact"
        className={cn(
          'h-7 px-2 text-[10px] font-bold uppercase tracking-wider',
          dns ? 'bg-white/10 text-white' : 'text-muted hover:text-white',
        )}
        aria-pressed={dns}
        onClick={onDns}
      >
        {t('results.dns')}
      </Button>
    </div>
  );
}

export function EventResults() {
  const {t} = useTranslation();
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const location = useLocation();
  const resultsState = location.state as EventResultsLocationState | null;
  const detailFrom = resultsState?.from;
  const {
    user,
    getAccessToken,
    isSignedIn,
    loading: authInitializing,
  } = useAuth();
  const {bumpRefresh, getLobbyPatch} = useJoinedEvents();
  const [entry, setEntry] = useState<ResultsEntryState | null>(null);
  const [activeGroup, setActiveGroup] = useState(1);
  const [loading, setLoading] = useState(true);
  const [resultsCheckFailed, setResultsCheckFailed] = useState(false);
  const [recheckingResults, setRecheckingResults] = useState(false);
  const showLoadingUI = useLoadingUI(loading);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [event, setEvent] = useState<ForzaEvent | null>(null);
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);
  const [guestGroupIndex, setGuestGroupIndex] = useState(1);
  const {setRichPresenceOverride} = useRichPresenceOverride();

  const displayEvent = useMemo(
    () => (event ? mergeOptimisticEventPatch(event, getLobbyPatch(event.id)) : null),
    [event, getLobbyPatch],
  );

  useEffect(() => {
    if (!displayEvent) return;
    setRichPresenceOverride(buildResultsRichPresence(displayEvent));
    return () => setRichPresenceOverride(null);
  }, [displayEvent, setRichPresenceOverride]);

  const pageMeta = useMemo(() => {
    if (!event) return null;
    const origin =
      typeof window !== 'undefined' ? window.location.origin : undefined;
    return buildEventPageMeta(event, {
      siteOrigin: origin,
      pageUrl: origin ? `${origin}${location.pathname}` : undefined,
      isResults: true,
    });
  }, [event, location.pathname]);
  usePageMetaOverride(pageMeta);

  const discordToken = getAccessToken();

  const goToEventDetail = useCallback(
    (
      target: {id: string; slug?: string | null},
      options?: {
        replace?: boolean;
        state?: Parameters<typeof buildEventDetailLocationState>[0];
      },
    ) => {
      navigate(eventDetailPath(target), {
        replace: options?.replace ?? true,
        state: buildEventDetailLocationState(options?.state, detailFrom),
      });
    },
    [navigate, detailFrom],
  );

  const recheckExistingResults = useCallback(async () => {
    if (!id || !event) return;
    setRecheckingResults(true);
    setResultsCheckFailed(false);
    try {
      const savedOutcome = await fetchEventResults(event.id);
      const savedCount = savedCountFromResultsFetch(savedOutcome);

      if (savedOutcome.error === 'fetch_failed') {
        setResultsCheckFailed(true);
        return;
      }

      if (shouldLeaveResultsScreen(event, savedCount, user)) {
        goToEventDetail(event);
      }
    } catch (err) {
      console.error('EventResults recheck', err);
      setResultsCheckFailed(true);
    } finally {
      setRecheckingResults(false);
    }
  }, [id, event, user, goToEventDetail]);

  useEffect(() => {
    if (!id) return;
    // Guest showcase mounts this route before Discord session restore — wait so hosts
    // are not bounced as guests via shouldLeaveResultsScreen.
    if (authInitializing) {
      setLoading(true);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setResultsCheckFailed(false);

    void (async () => {
      try {
        const loaded = await fetchEventById(id, {discordToken});
        if (cancelled) return;

        if (!loaded) {
          goToEventDetail({id});
          return;
        }

        setEvent(loaded);
        setTitle(loaded.title);

        if (shouldLeaveResultsScreen(loaded, null, user)) {
          goToEventDetail(loaded);
          return;
        }

        const savedOutcome = await fetchEventResults(loaded.id);
        if (cancelled) return;

        const savedCount = savedCountFromResultsFetch(savedOutcome);

        if (savedOutcome.error === 'fetch_failed') {
          setResultsCheckFailed(true);
        }

        if (shouldLeaveResultsScreen(loaded, savedCount, user)) {
          goToEventDetail(loaded);
          return;
        }

        const drivers = toEntryDrivers(resolveResultsRoster(loaded));
        const groups = [...new Set(drivers.map((d) => d.groupIndex))].sort(
          (a, b) => a - b,
        );
        setEntry(initResultsEntry(drivers, 'per_group'));
        setActiveGroup(groups[0] ?? 1);
      } catch (err) {
        if (!cancelled) {
          console.error('EventResults load', err);
          goToEventDetail({id});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, user, goToEventDetail, discordToken, authInitializing]);

  const groupCount = event?.groupCount ?? 1;
  const groupIndexes = Array.from({length: groupCount}, (_, i) => i + 1);
  const multiGroup = groupCount > 1;
  const entryComplete = entry ? isResultsEntryComplete(entry) : false;
  const addGroupIndex =
    entry?.mode === 'per_group' ? activeGroup : guestGroupIndex;

  const ordered = entry
    ? orderedDriversInScope(
        entry,
        entry.mode === 'per_group' ? activeGroup : undefined,
      )
    : [];
  const pool = entry
    ? poolDriversInScope(
        entry,
        entry.mode === 'per_group' ? activeGroup : undefined,
      )
    : [];

  async function handleSubmit() {
    if (!event || !entry || !entryComplete) return;
    setSaving(true);
    setError(null);

    try {
      const token = getAccessToken();
      if (!isSignedIn || !token) {
        throw new Error(t('results.signInRequired'));
      }
      if (!isApiConfigured()) {
        throw new Error(t('results.notConfigured'));
      }

      const extraById = new Map(
        entry.drivers
          .filter((d) => d.addedFromGuild)
          .map((d) => [d.discordId, d]),
      );
      const payload = buildResultSubmitRows(
        placementsForSubmit(entry),
        entry.mode,
      ).map((row) => {
        const extra = extraById.get(row.discord_id);
        if (!extra) return row;
        return {
          ...row,
          username: extra.username,
          avatar_url: extra.avatarUrl ?? null,
          gamertag: extra.gamertag?.trim() || undefined,
        };
      });

      if (payload.length === 0) {
        throw new Error(t('results.noParticipants'));
      }

      const submitRes = await submitEventResults(token, event.id, payload);
      track('submit_results', {outcome: 'success', event_id: event.id});
      const [updated, savedOutcome] = await Promise.all([
        fetchEventById(event.id, {discordToken: token}),
        fetchEventResults(event.id),
      ]);
      bumpRefresh();
      const detailEvent = updated ?? event;
      if (!detailEvent) return;
      const seeded =
        submitRes.rating_applied === false
          ? {...detailEvent, isRanked: true, ratingApplied: false}
          : detailEvent;
      goToEventDetail(seeded, {
        state: buildEventDetailNavigateStateAfterSubmit(
          seeded,
          savedOutcome,
          detailFrom,
        ),
      });
    } catch (e) {
      if (
        e instanceof ApiRequestError &&
        e.code === API_ERROR_CODES.RESULTS_ALREADY_SUBMITTED &&
        event
      ) {
        goToEventDetail(event);
        return;
      }
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  if (showLoadingUI) {
    return <PageLoading label={t('loading.results')} className="pb-10 pt-5" />;
  }

  if (loading || !event || !entry) {
    return null;
  }

  return (
    <ContentReveal className="pb-10 pt-5">
      <TextLink
        to={event ? eventDetailPath(event) : '/'}
        state={
          event ? buildEventDetailLocationState(undefined, detailFrom) : undefined
        }
        tone="nav"
        className="mb-5 inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('common.back')}
      </TextLink>

      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs text-muted">{t('results.instructions')}</p>
      <p className="mt-1 text-xs text-muted">
        {t(event.isRanked ? 'results.dnfDnsHintRanked' : 'results.dnfDnsHint')}
      </p>

      {multiGroup ? (
        <SegmentGroup
          containerClassName="mt-4"
          ariaLabel={t('results.rankingModeAria')}
          value={entry.mode}
          onChange={(mode) => {
            setEntry((s) => (s ? setResultsRankingMode(s, mode) : s));
            setActiveGroup(groupIndexes[0] ?? 1);
          }}
          options={[
            {value: 'per_group', label: t('results.modeByConvoy')},
            {value: 'overall', label: t('results.modeOverall')},
          ]}
        />
      ) : null}

      {multiGroup && entry.mode === 'per_group' ? (
        <SegmentGroup
          containerClassName="mt-3"
          ariaLabel={t('results.convoyPickerAria')}
          value={String(activeGroup)}
          onChange={(v) => setActiveGroup(Number(v))}
          options={groupIndexes.map((g) => ({
            value: String(g),
            label: t('eventDetail.group', {n: g}),
          }))}
        />
      ) : null}

      {resultsCheckFailed && (
        <Alert variant="info" className="mt-4 flex flex-col gap-2">
          <p>{t('results.existingCheckFailed')}</p>
          <TextButton
            tone="emphasis"
            className="self-start text-xs"
            disabled={recheckingResults}
            onClick={() => void recheckExistingResults()}
          >
            {recheckingResults ? busyLabel('working') : t('common.tryAgain')}
          </TextButton>
        </Alert>
      )}

      {error && (
        <Alert variant="info" className="mt-4">
          {error}
        </Alert>
      )}

      <p className={cn(sectionLabelClass, 'mt-6')}>
        {t('results.finishOrder')}
      </p>
      {ordered.length === 0 ? (
        <p className="mt-2 text-xs text-muted">
          {t('results.finishOrderEmpty')}
        </p>
      ) : (
        <ol className="mt-2 space-y-2">
          {ordered.map((row, index) => (
            <li key={row.discordId}>
              <Panel
                variant="soft"
                className="flex items-center gap-2 px-3 py-2.5"
              >
                <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-amber-300/90">
                  {index + 1}
                </span>
                <UserAvatar
                  src={row.avatarUrl}
                  name={row.label}
                  size="xs"
                  variant="neutral"
                />
                <span className="min-w-0 flex-1 truncate text-sm text-white">
                  {row.label}
                </span>
                {entry.mode === 'overall' && multiGroup ? (
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted">
                    {t('eventDetail.group', {n: row.groupIndex})}
                  </span>
                ) : null}
                <div className="flex shrink-0 flex-col">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="p-0.5 text-muted hover:text-white disabled:opacity-30"
                    disabled={index === 0}
                    onClick={() =>
                      setEntry((s) =>
                        s ? moveOrderedDriver(s, row.discordId, -1) : s,
                      )
                    }
                    aria-label={t('results.moveUp')}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="p-0.5 text-muted hover:text-white disabled:opacity-30"
                    disabled={index === ordered.length - 1}
                    onClick={() =>
                      setEntry((s) =>
                        s ? moveOrderedDriver(s, row.discordId, 1) : s,
                      )
                    }
                    aria-label={t('results.moveDown')}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 p-1 text-muted hover:text-white"
                  onClick={() =>
                    setEntry((s) => (s ? unplaceDriver(s, row.discordId) : s))
                  }
                  aria-label={t('results.removeFromOrder')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </Panel>
            </li>
          ))}
        </ol>
      )}

      <p className={cn(sectionLabelClass, 'mt-6')}>{t('results.remaining')}</p>
      {pool.length === 0 ? (
        <p className="mt-2 text-xs text-muted">{t('results.remainingEmpty')}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {pool.map((row) => {
            const outcome = entry.outcome[row.discordId] ?? 'pending';
            const isOut = outcome === 'dnf' || outcome === 'dns';
            return (
              <li key={row.discordId}>
                <Panel
                  variant="soft"
                  className={cn(
                    'flex items-center gap-2 px-3 py-2.5',
                    !isOut && 'cursor-pointer hover:bg-white/[0.06]',
                  )}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:cursor-default"
                    disabled={isOut}
                    onClick={() =>
                      setEntry((s) => (s ? placeDriver(s, row.discordId) : s))
                    }
                  >
                    <span
                      className={cn(
                        'w-6 shrink-0 text-center text-[10px] font-bold uppercase tracking-wider',
                        isOut ? 'text-muted' : 'text-slate-500',
                      )}
                    >
                      {isOut
                        ? outcome === 'dns'
                          ? t('results.dns')
                          : t('results.dnf')
                        : '·'}
                    </span>
                    <UserAvatar
                      src={row.avatarUrl}
                      name={row.label}
                      size="xs"
                      variant="neutral"
                    />
                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate text-sm',
                        isOut ? 'text-muted' : 'text-slate-200',
                      )}
                    >
                      {row.label}
                    </span>
                    {entry.mode === 'overall' && multiGroup ? (
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-muted">
                        {t('eventDetail.group', {n: row.groupIndex})}
                      </span>
                    ) : null}
                  </button>
                  <OutcomeChips
                    dnf={outcome === 'dnf'}
                    dns={outcome === 'dns'}
                    onDnf={() =>
                      setEntry((s) =>
                        s
                          ? setDriverOutcome(
                              s,
                              row.discordId,
                              outcome === 'dnf' ? 'pending' : 'dnf',
                            )
                          : s,
                      )
                    }
                    onDns={() =>
                      setEntry((s) =>
                        s
                          ? setDriverOutcome(
                              s,
                              row.discordId,
                              outcome === 'dns' ? 'pending' : 'dns',
                            )
                          : s,
                      )
                    }
                  />
                  {row.addedFromGuild ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 p-1 text-muted hover:text-white"
                      onClick={() =>
                        setEntry((s) =>
                          s ? removeResultsDriver(s, row.discordId) : s,
                        )
                      }
                      aria-label={t('results.removeGuest')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : null}
                </Panel>
              </li>
            );
          })}
        </ul>
      )}

      {discordToken &&
      (event.guildId || event.participants.some((p) => p.waitlisted)) ? (
        <div className="mt-8 space-y-3">
          {multiGroup && entry.mode === 'overall' ? (
            <div className="space-y-2">
              <p className={sectionLabelClass}>{t('results.addToConvoy')}</p>
              <SegmentGroup
                ariaLabel={t('results.addToConvoyAria')}
                value={String(guestGroupIndex)}
                onChange={(v) => setGuestGroupIndex(Number(v))}
                options={groupIndexes.map((g) => ({
                  value: String(g),
                  label: t('eventDetail.group', {n: g}),
                }))}
              />
            </div>
          ) : null}
          <ResultsGuestSearch
            accessToken={discordToken}
            guildId={event.guildId}
            excludeDiscordIds={entry.drivers.map((d) => d.discordId)}
            waitlist={event.participants
              .filter((p) => p.waitlisted)
              .map((p) => ({
                discordId: p.discordId,
                username: p.username,
                gamertag: p.gamertag ?? null,
                avatarUrl: p.avatarUrl,
              }))}
            onPick={(member) => {
              setEntry((s) =>
                s
                  ? addResultsDriver(s, {
                      discordId: member.discordId,
                      label:
                        member.gamertag?.trim() ||
                        formatDiscordHandle(member.username) ||
                        member.username,
                      avatarUrl: member.avatarUrl,
                      groupIndex: addGroupIndex,
                      username: member.username,
                      gamertag: member.gamertag,
                      addedFromGuild: true,
                    })
                  : s,
              );
            }}
          />
        </div>
      ) : null}

      {entry.drivers.length === 0 && !event.guildId ? (
        <p className="mt-8 text-center text-sm text-muted">
          {t('results.noParticipants')}
        </p>
      ) : null}

      {!entryComplete && entry.drivers.length > 0 ? (
        <p className="mt-6 text-center text-xs text-muted">
          {t('results.placeAllHint')}
        </p>
      ) : null}

      <Button
        variant="primary"
        fullWidth
        className="mt-4"
        disabled={saving || !entryComplete}
        onClick={() => setSubmitConfirmOpen(true)}
      >
        {saving ? busyLabel('saving') : t('eventDetail.submitResults')}
      </Button>

      <ConfirmDialog
        open={submitConfirmOpen}
        title={t('results.submitTitle')}
        description={t('results.submitDesc')}
        confirmLabel={t('eventDetail.submitResults')}
        busy={saving}
        onCancel={() => setSubmitConfirmOpen(false)}
        onConfirm={() => {
          setSubmitConfirmOpen(false);
          void handleSubmit();
        }}
      />
    </ContentReveal>
  );
}
