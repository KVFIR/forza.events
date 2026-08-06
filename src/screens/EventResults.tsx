import {useCallback, useEffect, useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {busyLabel} from '../i18n/busyLabels';
import {useNavigate, useParams, useLocation} from 'react-router-dom';
import {ArrowLeft, ChevronDown, ChevronUp, X} from 'lucide-react';
import {useAuth} from '../context/AuthContext';
import {useRichPresenceOverride} from '../context/DiscordRichPresenceContext';
import {useJoinedEvents} from '../context/JoinedEventsContext';
import {buildResultsRichPresence} from '../lib/discordRichPresence';
import {mergeOptimisticEventPatch} from '../lib/eventParticipation';
import type {ForzaEvent} from '../lib/types';
import {ApiRequestError, isApiConfigured, submitEventResults} from '../lib/api';
import {track} from '../lib/analytics';
import {API_ERROR_CODES} from '../lib/apiErrorCodes';
import {buildResultSubmitRows} from '../lib/eventResults';
import {resolveResultsRoster} from '../lib/eventRoster';
import {fetchEventById, fetchEventResults} from '../lib/events';
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
import type {EventParticipant} from '../lib/types';
import {
  initResultsEntry,
  isResultsEntryComplete,
  moveOrderedDriver,
  orderedDriversInScope,
  placeDriver,
  placementsForSubmit,
  poolDriversInScope,
  resultsEntryGroupIndexes,
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
import {sectionLabelClass} from '../components/ui/formStyles';
import {useLoadingUI} from '../hooks/useLoadingUI';
import {cn} from '../lib/cn';

function toEntryDrivers(participants: EventParticipant[]): ResultsEntryDriver[] {
  return participants.map((p) => ({
    discordId: p.discordId,
    label: p.gamertag ?? p.username,
    avatarUrl: p.avatarUrl,
    groupIndex: p.groupIndex ?? 1,
  }));
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
  const {user, getAccessToken, isSignedIn, loading: authInitializing} = useAuth();
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
  const {setRichPresenceOverride} = useRichPresenceOverride();

  const displayEvent = useMemo(
    () => (event && id ? mergeOptimisticEventPatch(event, getLobbyPatch(id)) : null),
    [event, id, getLobbyPatch],
  );

  useEffect(() => {
    if (!displayEvent) return;
    setRichPresenceOverride(buildResultsRichPresence(displayEvent));
    return () => setRichPresenceOverride(null);
  }, [displayEvent, setRichPresenceOverride]);

  const pageMeta = useMemo(() => {
    if (!event) return null;
    const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
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
      eventId: string,
      options?: {replace?: boolean; state?: Parameters<typeof buildEventDetailLocationState>[0]},
    ) => {
      navigate(`/event/${eventId}`, {
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
      const savedOutcome = await fetchEventResults(id);
      const savedCount = savedCountFromResultsFetch(savedOutcome);

      if (savedOutcome.error === 'fetch_failed') {
        setResultsCheckFailed(true);
        return;
      }

      if (shouldLeaveResultsScreen(event, savedCount, user)) {
        goToEventDetail(id);
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
          goToEventDetail(id);
          return;
        }

        setEvent(loaded);
        setTitle(loaded.title);

        if (shouldLeaveResultsScreen(loaded, null, user)) {
          goToEventDetail(id);
          return;
        }

        const savedOutcome = await fetchEventResults(id);
        if (cancelled) return;

        const savedCount = savedCountFromResultsFetch(savedOutcome);

        if (savedOutcome.error === 'fetch_failed') {
          setResultsCheckFailed(true);
        }

        if (shouldLeaveResultsScreen(loaded, savedCount, user)) {
          goToEventDetail(id);
          return;
        }

        const drivers = toEntryDrivers(resolveResultsRoster(loaded));
        const groups = [...new Set(drivers.map((d) => d.groupIndex))].sort((a, b) => a - b);
        setEntry(initResultsEntry(drivers, 'per_group'));
        setActiveGroup(groups[0] ?? 1);
      } catch (err) {
        if (!cancelled) {
          console.error('EventResults load', err);
          goToEventDetail(id);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, user, goToEventDetail, discordToken, authInitializing]);

  const groupIndexes = entry ? resultsEntryGroupIndexes(entry) : [];
  const multiGroup = groupIndexes.length > 1;
  const entryComplete = entry ? isResultsEntryComplete(entry) : false;

  const ordered = entry
    ? orderedDriversInScope(entry, entry.mode === 'per_group' ? activeGroup : undefined)
    : [];
  const pool = entry
    ? poolDriversInScope(entry, entry.mode === 'per_group' ? activeGroup : undefined)
    : [];

  async function handleSubmit() {
    if (!id || !entry || !entryComplete) return;
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

      const fresh = await fetchEventById(id, {discordToken: token});
      if (!fresh) {
        throw new Error(t('eventDetail.notFound'));
      }
      const allowedIds = new Set(resolveResultsRoster(fresh).map((p) => p.discordId));
      const payload = buildResultSubmitRows(
        placementsForSubmit(entry).filter((p) => allowedIds.has(p.discordId)),
        entry.mode,
      );

      if (payload.length === 0) {
        throw new Error(t('results.noParticipants'));
      }

      const submitRes = await submitEventResults(token, id, payload);
      track('submit_results', {outcome: 'success', event_id: id});
      const [updated, savedOutcome] = await Promise.all([
        fetchEventById(id, {discordToken: token}),
        fetchEventResults(id),
      ]);
      bumpRefresh();
      let detailEvent = updated ?? fresh;
      if (submitRes.rating_applied === false) {
        detailEvent = {...detailEvent, isRanked: true, ratingApplied: false};
      }
      goToEventDetail(id, {
        state: buildEventDetailNavigateStateAfterSubmit(detailEvent, savedOutcome, detailFrom),
      });
    } catch (e) {
      if (
        e instanceof ApiRequestError &&
        e.code === API_ERROR_CODES.RESULTS_ALREADY_SUBMITTED &&
        id
      ) {
        goToEventDetail(id);
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
        to={id ? `/event/${id}` : '/'}
        state={id ? buildEventDetailLocationState(undefined, detailFrom) : undefined}
        tone="nav"
        className="mb-5 inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('common.back')}
      </TextLink>

      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs text-muted">{t('results.instructions')}</p>

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

      <p className={cn(sectionLabelClass, 'mt-6')}>{t('results.finishOrder')}</p>
      {ordered.length === 0 ? (
        <p className="mt-2 text-xs text-muted">{t('results.finishOrderEmpty')}</p>
      ) : (
        <ol className="mt-2 space-y-2">
          {ordered.map((row, index) => (
            <li key={row.discordId}>
              <Panel variant="soft" className="flex items-center gap-2 px-3 py-2.5">
                <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-amber-300/90">
                  {index + 1}
                </span>
                <UserAvatar src={row.avatarUrl} name={row.label} size="xs" variant="neutral" />
                <span className="min-w-0 flex-1 truncate text-sm text-white">{row.label}</span>
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
                    onClick={() => setEntry((s) => (s ? moveOrderedDriver(s, row.discordId, -1) : s))}
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
                    onClick={() => setEntry((s) => (s ? moveOrderedDriver(s, row.discordId, 1) : s))}
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
                  onClick={() => setEntry((s) => (s ? unplaceDriver(s, row.discordId) : s))}
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
                    onClick={() => setEntry((s) => (s ? placeDriver(s, row.discordId) : s))}
                  >
                    <span
                      className={cn(
                        'w-6 shrink-0 text-center text-[10px] font-bold uppercase tracking-wider',
                        isOut ? 'text-muted' : 'text-slate-500',
                      )}
                    >
                      {isOut ? (outcome === 'dns' ? t('results.dns') : t('results.dnf')) : '·'}
                    </span>
                    <UserAvatar src={row.avatarUrl} name={row.label} size="xs" variant="neutral" />
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
                </Panel>
              </li>
            );
          })}
        </ul>
      )}

      {entry.drivers.length === 0 && (
        <p className="mt-8 text-center text-sm text-muted">{t('results.noParticipants')}</p>
      )}

      {!entryComplete && entry.drivers.length > 0 ? (
        <p className="mt-6 text-center text-xs text-muted">{t('results.placeAllHint')}</p>
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
