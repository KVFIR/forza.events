import {useCallback, useEffect, useState} from 'react';
import {Navigate} from 'react-router-dom';
import {Button} from '../components/ui/Button';
import {sectionLabelClass} from '../components/ui/formStyles';
import {
  clearIngestFailureCounts,
  formatIngestFailureSummary,
  readIngestFailureCounts,
} from '../lib/analytics';
import {
  fetchAnalyticsDashboard,
  isAnalyticsDashboardConfigured,
  type AnalyticsDashboardSummary,
  type ConversionMetric,
} from '../lib/analyticsDashboard';
import {isLocalDevHost} from '../lib/runtime';
import {cn} from '../lib/cn';

const DAY_OPTIONS = [1, 7, 14, 30, 90] as const;

const FUNNEL_LABELS: Record<string, string> = {
  session_start: 'Sessions',
  browse_view: 'Browse views',
  event_view: 'Event views',
  create_open: 'Create opens',
  auth_success: 'Auth OK',
  auth_failed: 'Auth failed',
  join: 'Joins',
  leave: 'Leaves',
  publish: 'Publishes',
  draft_save: 'Draft saves',
  cancel_event: 'Cancels',
  submit_results: 'Results submitted',
  add_group: 'Groups added',
  change_group_leader: 'Leader changes',
  bot_install_click: 'Bot install clicks',
  empty_guild_list: 'Empty guild lists',
  session_expired: 'Session expired',
  api_error: 'API errors',
};

function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

function formatRate(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) return '—';
  return `${rate}%`;
}

function recordRows(record: Record<string, number> | undefined): {key: string; value: number}[] {
  if (!record) return [];
  return Object.entries(record).map(([key, value]) => ({key, value: Number(value) || 0}));
}

function StatCard({label, value, hint}: {label: string; value: string; hint?: string}) {
  return (
    <div className="rounded-lg border border-white/10 bg-surface/60 p-4">
      <p className={cn(sectionLabelClass, 'mb-2')}>{label}</p>
      <p className="text-2xl font-bold tabular-nums text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

function ConversionCard({
  title,
  metric,
}: {
  title: string;
  metric: ConversionMetric | undefined;
}) {
  const success = metric?.success ?? 0;
  const failed = metric?.failed ?? 0;
  return (
    <div className="rounded-lg border border-white/10 bg-surface/60 p-4">
      <p className={cn(sectionLabelClass, 'mb-2')}>{title}</p>
      <p className="text-2xl font-bold tabular-nums text-white">{formatRate(metric?.rate)}</p>
      <p className="mt-1 text-xs text-muted">
        {formatNumber(success)} ok · {formatNumber(failed)} failed
      </p>
    </div>
  );
}

function KeyValueTable({
  title,
  rows,
  labelMap = {},
  emptyLabel = 'No data',
}: {
  title: string;
  rows: {key: string; value: number}[];
  labelMap?: Record<string, string>;
  emptyLabel?: string;
}) {
  const sorted = [...rows].sort((a, b) => b.value - a.value);
  return (
    <section className="rounded-lg border border-white/10 bg-surface/40 p-4">
      <h2 className={cn(sectionLabelClass, 'mb-3')}>{title}</h2>
      {sorted.length === 0 ? (
        <p className="text-sm text-muted">{emptyLabel}</p>
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {sorted.map((row) => (
              <tr key={row.key} className="border-t border-white/5 first:border-t-0">
                <td className="py-2 pr-3 text-slate-200">
                  {labelMap[row.key] ?? row.key}
                </td>
                <td className="py-2 text-right font-mono tabular-nums text-muted">
                  {formatNumber(row.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export function AnalyticsDashboard() {
  const [days, setDays] = useState<number>(7);
  const [summary, setSummary] = useState<AnalyticsDashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ingestFailures, setIngestFailures] = useState(readIngestFailureCounts);
  const ingestFailureSummary = formatIngestFailureSummary(ingestFailures);

  useEffect(() => {
    const syncIngestFailures = () => setIngestFailures(readIngestFailureCounts());
    syncIngestFailures();
    window.addEventListener('focus', syncIngestFailures);
    window.addEventListener('visibilitychange', syncIngestFailures);
    return () => {
      window.removeEventListener('focus', syncIngestFailures);
      window.removeEventListener('visibilitychange', syncIngestFailures);
    };
  }, []);

  const load = useCallback(async (range: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAnalyticsDashboard(range);
      setSummary(data);
    } catch (e) {
      setSummary(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLocalDevHost() || !isAnalyticsDashboardConfigured()) return;
    void load(days);
  }, [days, load]);

  if (!isLocalDevHost()) {
    return <Navigate to="/" replace />;
  }

  const configured = isAnalyticsDashboardConfigured();
  const engagement = summary?.conversion?.event_views_per_session;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-3 py-4 sm:px-5 md:px-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300/90">
            Local dev only
          </p>
          <h1 className="text-2xl font-black tracking-tight text-white">Analytics dashboard</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Product health: surfaces (Activity vs browser), funnel, conversion rates, and API
            errors from <code className="text-slate-300">client_events</code>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {DAY_OPTIONS.map((option) => (
            <Button
              key={option}
              type="button"
              variant={days === option ? 'primary' : 'secondary'}
              className="min-w-[3rem]"
              disabled={!configured || loading}
              onClick={() => setDays(option)}
            >
              {option}d
            </Button>
          ))}
          <Button
            type="button"
            variant="secondary"
            disabled={!configured || loading}
            onClick={() => void load(days)}
          >
            {loading ? 'Loading…' : 'Refresh'}
          </Button>
        </div>
      </header>

      {!configured ? (
        <div className="rounded-lg border border-amber-400/30 bg-amber-950/20 p-4 text-sm text-amber-100/90">
          <p className="font-semibold">Dashboard secret not configured</p>
          <p className="mt-2 text-amber-100/80">
            Set <code className="text-amber-50">ANALYTICS_DASHBOARD_SECRET</code> in{' '}
            <code className="text-amber-50">.env</code>, run{' '}
            <code className="text-amber-50">npm run sync:secrets</code>, apply migration{' '}
            <code className="text-amber-50">023</code>, redeploy{' '}
            <code className="text-amber-50">analytics-dashboard</code>.
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-400/30 bg-red-950/30 p-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {ingestFailureSummary ? (
        <div className="rounded-lg border border-amber-400/30 bg-amber-950/20 p-4 text-sm text-amber-100/90">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold">Client ingest failures (this tab)</p>
              <p className="mt-2 text-amber-100/80">
                {ingestFailureSummary}. Check{' '}
                <code className="text-amber-50">ANALYTICS_TRACK_SECRET</code> in{' '}
                <code className="text-amber-50">.env</code> / Railway build env and restart dev server.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                clearIngestFailureCounts();
                setIngestFailures({});
              }}
            >
              Dismiss
            </Button>
          </div>
        </div>
      ) : null}

      {summary ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Sessions" value={formatNumber(summary.sessions)} />
            <StatCard label="Unique users" value={formatNumber(summary.unique_users)} hint="Discord ID only" />
            <StatCard
              label="Total events"
              value={formatNumber(summary.total_events)}
              hint="Raw rows logged"
            />
            <StatCard
              label="API errors"
              value={formatNumber(summary.funnel.api_error ?? 0)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ConversionCard title="Auth success rate" metric={summary.conversion?.auth} />
            <ConversionCard title="Join success rate" metric={summary.conversion?.join} />
            <ConversionCard title="Publish success rate" metric={summary.conversion?.publish} />
            <StatCard
              label="Event views / session"
              value={
                engagement?.avg !== null && engagement?.avg !== undefined
                  ? String(engagement.avg)
                  : '—'
              }
              hint={`${formatNumber(engagement?.event_views ?? 0)} views · ${formatNumber(engagement?.sessions ?? 0)} sessions`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <KeyValueTable title="Sessions by surface" rows={recordRows(summary.sessions_by_surface)} />
            <KeyValueTable
              title="Unique users by surface"
              rows={recordRows(summary.unique_users_by_surface)}
            />
            <KeyValueTable
              title="Funnel"
              rows={recordRows(summary.funnel)}
              labelMap={FUNNEL_LABELS}
            />
            <KeyValueTable title="Host actions" rows={recordRows(summary.host_actions)} />
            <KeyValueTable
              title="Errors by surface"
              rows={recordRows(summary.errors_by_surface)}
            />
            <KeyValueTable
              title="Errors by Edge function"
              rows={recordRows(summary.errors_by_function)}
            />
          </div>

          {Object.keys(summary.funnel_by_surface ?? {}).length > 0 ? (
            <section className="rounded-lg border border-white/10 bg-surface/40 p-4">
              <h2 className={cn(sectionLabelClass, 'mb-3')}>Funnel by surface</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {Object.entries(summary.funnel_by_surface).map(([surface, events]) => (
                  <KeyValueTable
                    key={surface}
                    title={surface}
                    rows={recordRows(events)}
                    labelMap={FUNNEL_LABELS}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-lg border border-white/10 bg-surface/40 p-4">
            <h2 className={cn(sectionLabelClass, 'mb-3')}>Top API errors</h2>
            {summary.top_errors.length === 0 ? (
              <p className="text-sm text-muted">No API errors in this window.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[32rem] text-sm">
                  <thead>
                    <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-muted">
                      <th className="pb-2 pr-3">Code</th>
                      <th className="pb-2 pr-3">Function</th>
                      <th className="pb-2 text-right">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.top_errors.map((row) => (
                      <tr
                        key={`${row.code}:${row.function_name ?? ''}`}
                        className="border-t border-white/5"
                      >
                        <td className="py-2 pr-3 font-mono text-slate-200">{row.code}</td>
                        <td className="py-2 pr-3 text-muted">{row.function_name ?? '—'}</td>
                        <td className="py-2 text-right font-mono tabular-nums text-slate-200">
                          {formatNumber(row.count)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-white/10 bg-surface/40 p-4">
            <h2 className={cn(sectionLabelClass, 'mb-3')}>Recent errors</h2>
            {summary.recent_errors.length === 0 ? (
              <p className="text-sm text-muted">No recent errors.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[40rem] text-sm">
                  <thead>
                    <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-muted">
                      <th className="pb-2 pr-3">Time</th>
                      <th className="pb-2 pr-3">Surface</th>
                      <th className="pb-2 pr-3">Code</th>
                      <th className="pb-2 pr-3">Function</th>
                      <th className="pb-2 text-right">HTTP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.recent_errors.map((row, index) => (
                      <tr key={`${row.at}:${index}`} className="border-t border-white/5">
                        <td className="py-2 pr-3 whitespace-nowrap text-muted">
                          {new Date(row.at).toLocaleString()}
                        </td>
                        <td className="py-2 pr-3 text-slate-200">{row.surface}</td>
                        <td className="py-2 pr-3 font-mono text-slate-200">{row.code}</td>
                        <td className="py-2 pr-3 text-muted">{row.function_name ?? '—'}</td>
                        <td className="py-2 text-right font-mono tabular-nums text-muted">
                          {row.http_status ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-white/10 bg-surface/40 p-4">
            <h2 className={cn(sectionLabelClass, 'mb-3')}>Daily volume</h2>
            {summary.daily.length === 0 ? (
              <p className="text-sm text-muted">No events in this window.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[28rem] text-sm">
                  <thead>
                    <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-muted">
                      <th className="pb-2 pr-3">Day</th>
                      <th className="pb-2 pr-3 text-right">Events</th>
                      <th className="pb-2 pr-3 text-right">Users</th>
                      <th className="pb-2 text-right">Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.daily.map((row) => (
                      <tr key={row.day} className="border-t border-white/5">
                        <td className="py-2 pr-3 text-slate-200">{row.day}</td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums text-muted">
                          {formatNumber(row.events)}
                        </td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums text-muted">
                          {formatNumber(row.users)}
                        </td>
                        <td className="py-2 text-right font-mono tabular-nums text-red-300/80">
                          {formatNumber(row.errors)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <p className="text-xs text-muted">
            Window since {new Date(summary.since).toLocaleString()} ({summary.days} day
            {summary.days === 1 ? '' : 's'}).
          </p>
        </>
      ) : loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : null}
    </div>
  );
}
