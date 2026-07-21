import {useCallback, useEffect, useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {busyLabel} from '../i18n/busyLabels';
import {useNavigate, useParams, useLocation} from 'react-router-dom';
import {ArrowLeft, ChevronDown, ChevronUp} from 'lucide-react';
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
import {Alert} from '../components/ui/Alert';
import {Button} from '../components/ui/Button';
import {CheckboxField} from '../components/ui/CheckboxField';
import {Panel} from '../components/ui/Panel';
import {UserAvatar} from '../components/UserAvatar';
import {TextButton, TextLink} from '../components/ui/TextButton';
import {ConfirmDialog} from '../components/ui/ConfirmDialog';
import {ContentReveal} from '../components/ui/ContentReveal';
import {PageLoading} from '../components/ui/PageLoading';
import {useLoadingUI} from '../hooks/useLoadingUI';
import {cn} from '../lib/cn';

type Placement = {
  discordId: string;
  label: string;
  avatarUrl?: string;
  dnf: boolean;
  dns: boolean;
};

type PlacementGroup = {
  groupIndex: number;
  rows: Placement[];
};

function participantLabel(p: EventParticipant): string {
  return p.gamertag ?? p.username;
}

/** One ordered block per lobby group (results positions restart per group). */
function buildPlacementGroups(participants: EventParticipant[]): PlacementGroup[] {
  const byGroup = new Map<number, Placement[]>();
  for (const p of participants) {
    const g = p.groupIndex ?? 1;
    const row: Placement = {
      discordId: p.discordId,
      label: participantLabel(p),
      avatarUrl: p.avatarUrl,
      dnf: false,
      dns: false,
    };
    const list = byGroup.get(g);
    if (list) list.push(row);
    else byGroup.set(g, [row]);
  }
  return [...byGroup.keys()]
    .sort((a, b) => a - b)
    .map((groupIndex) => ({groupIndex, rows: byGroup.get(groupIndex)!}));
}

export function EventResults() {
  const {t} = useTranslation();
  const {id} = useParams<{id: string}>();
  const navigate = useNavigate();
  const location = useLocation();
  const resultsState = location.state as EventResultsLocationState | null;
  const detailFrom = resultsState?.from;
  const {user, getAccessToken, isSignedIn} = useAuth();
  const {bumpRefresh, getLobbyPatch} = useJoinedEvents();
  const [placementGroups, setPlacementGroups] = useState<PlacementGroup[]>([]);
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

        setPlacementGroups(buildPlacementGroups(resolveResultsRoster(loaded)));
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
  }, [id, user, goToEventDetail, discordToken]);

  function updateGroup(groupIndex: number, updater: (rows: Placement[]) => Placement[]) {
    setPlacementGroups((groups) =>
      groups.map((g) => (g.groupIndex === groupIndex ? {...g, rows: updater(g.rows)} : g)),
    );
  }

  function move(groupIndex: number, index: number, dir: -1 | 1) {
    updateGroup(groupIndex, (rows) => {
      const next = index + dir;
      if (next < 0 || next >= rows.length) return rows;
      const copy = [...rows];
      [copy[index], copy[next]] = [copy[next], copy[index]];
      return copy;
    });
  }

  function toggleDnf(groupIndex: number, index: number) {
    updateGroup(groupIndex, (rows) =>
      rows.map((row, i) => (i === index ? {...row, dnf: !row.dnf, dns: false} : row)),
    );
  }

  function toggleDns(groupIndex: number, index: number) {
    updateGroup(groupIndex, (rows) =>
      rows.map((row, i) => (i === index ? {...row, dns: !row.dns, dnf: false} : row)),
    );
  }

  const allPlacements = placementGroups.flatMap((g) =>
    g.rows.map((row) => ({...row, groupIndex: g.groupIndex})),
  );

  async function handleSubmit() {
    if (!id || allPlacements.length === 0) return;
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
      const allowedIds = new Set(
        resolveResultsRoster(fresh).map((p) => p.discordId),
      );
      const payload = buildResultSubmitRows(
        allPlacements.filter((p) => allowedIds.has(p.discordId)),
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
      // Surface failed ELO apply on Event Detail (retry CTA) even if detail fetch is stale.
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

  if (loading || !event) {
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

      {placementGroups.map((group) => (
        <div key={group.groupIndex} className="mt-5">
          {placementGroups.length > 1 ? (
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">
              {t('eventDetail.group', {n: group.groupIndex})}
            </p>
          ) : null}
          <ol className="space-y-2">
            {group.rows.map((row, index) => {
              const finisherIndex = group.rows
                .slice(0, index + 1)
                .filter((p) => !p.dnf && !p.dns).length;
              const positionLabel = row.dns
                ? t('results.dns')
                : row.dnf
                  ? t('results.dnf')
                  : String(finisherIndex);

              return (
                <li key={row.discordId}>
                  <Panel variant="soft" className="flex items-center gap-2 px-3 py-2.5">
                    <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-muted">
                      {positionLabel}
                    </span>
                    <UserAvatar src={row.avatarUrl} name={row.label} size="xs" variant="neutral" />
                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate text-sm',
                        (row.dnf || row.dns) && 'text-muted',
                      )}
                    >
                      {row.label}
                    </span>
                    <CheckboxField
                      label={t('results.dnf')}
                      checked={row.dnf}
                      onChange={() => toggleDnf(group.groupIndex, index)}
                    />
                    <CheckboxField
                      label={t('results.dns')}
                      checked={row.dns}
                      onChange={() => toggleDns(group.groupIndex, index)}
                    />
                    <div className="flex shrink-0 flex-col">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="p-0.5 text-muted hover:text-white disabled:opacity-30"
                        disabled={index === 0}
                        onClick={() => move(group.groupIndex, index, -1)}
                        aria-label={t('results.moveUp')}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="p-0.5 text-muted hover:text-white disabled:opacity-30"
                        disabled={index === group.rows.length - 1}
                        onClick={() => move(group.groupIndex, index, 1)}
                        aria-label={t('results.moveDown')}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </Panel>
                </li>
              );
            })}
          </ol>
        </div>
      ))}

      {allPlacements.length === 0 && (
        <p className="mt-8 text-center text-sm text-muted">{t('results.noParticipants')}</p>
      )}

      <Button
        variant="primary"
        fullWidth
        className="mt-8"
        disabled={saving || allPlacements.length === 0}
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
