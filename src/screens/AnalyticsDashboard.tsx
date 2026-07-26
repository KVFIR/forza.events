import {useCallback, useEffect, useState, type ReactNode} from 'react';
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
  type NotificationDashboard,
} from '../lib/analyticsDashboard';
import {
  buildWatchItems,
  healthWatchSummary,
  type WatchItem,
  type WatchStatus,
} from '../lib/analyticsHealthWatch';
import {isLocalDevHost} from '../lib/runtime';
import {cn} from '../lib/cn';

const DAY_OPTIONS = [1, 7, 14, 30, 90] as const;

const DASHBOARD_TABS = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Headline volume, conversion rates, and engagement for the selected window.',
  },
  {
    id: 'surfaces',
    label: 'Surfaces',
    description: 'Activity iframe vs browser web — sessions and unique users per surface.',
  },
  {
    id: 'funnel',
    label: 'Funnel',
    description: 'Client-side product events grouped by journey stage.',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    description: 'Discord DM outbox delivery, skip reasons, and profile bell toggles.',
  },
  {
    id: 'errors',
    label: 'Errors',
    description: 'API failures by surface, Edge function, and recent occurrences.',
  },
  {
    id: 'trends',
    label: 'Trends',
    description: 'Daily volume for client telemetry and DM outbox.',
  },
] as const;

type DashboardTabId = (typeof DASHBOARD_TABS)[number]['id'];

const ANALYTICS_TAB_KEY = 'forza.analytics.tab';

function isDashboardTabId(value: string): value is DashboardTabId {
  return DASHBOARD_TABS.some((tab) => tab.id === value);
}

function readStoredTab(): DashboardTabId {
  if (typeof sessionStorage === 'undefined') return 'overview';
  const stored = sessionStorage.getItem(ANALYTICS_TAB_KEY);
  return stored && isDashboardTabId(stored) ? stored : 'overview';
}

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
  notification_dm_enable: 'DM notifications on',
  notification_dm_disable: 'DM notifications off',
};

const FUNNEL_GROUPS: {title: string; keys: readonly string[]}[] = [
  {
    title: 'Discovery',
    keys: ['session_start', 'browse_view', 'event_view', 'create_open'],
  },
  {
    title: 'Auth',
    keys: ['auth_success', 'auth_failed', 'session_expired'],
  },
  {
    title: 'Participation',
    keys: ['join', 'leave'],
  },
  {
    title: 'Host',
    keys: [
      'publish',
      'draft_save',
      'cancel_event',
      'submit_results',
      'add_group',
      'change_group_leader',
      'bot_install_click',
      'empty_guild_list',
    ],
  },
  {
    title: 'Notification prefs',
    keys: ['notification_dm_enable', 'notification_dm_disable'],
  },
];

const NOTIFICATION_KIND_LABELS: Record<string, string> = {
  event_cancelled: 'Event cancelled',
  convoy_leader_changed: 'Convoy leader changed',
  convoy_leader_assigned: 'Convoy leader assigned',
  waitlist_seat_opened: 'Waitlist seat opened',
  waitlist_new_group: 'Waitlist new convoy',
  waitlist_new_group_leader: 'Waitlist new convoy (leader)',
  event_updated: 'Event updated',
  event_starting_soon: 'Starting soon (racer)',
  host_group_filled: 'Host: convoy full',
  host_event_starting_soon: 'Starting soon (host)',
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

function funnelGroupRows(
  funnel: Record<string, number>,
  keys: readonly string[],
): {key: string; value: number}[] {
  return keys
    .map((key) => ({key, value: funnel[key] ?? 0}))
    .filter((row) => row.value > 0);
}

const WATCH_STATUS_BORDER: Record<WatchStatus, string> = {
  ok: 'border-emerald-500/45',
  warn: 'border-amber-400/55',
  critical: 'border-red-400/65',
  unknown: 'border-white/15',
};

const WATCH_STATUS_LABEL: Record<WatchStatus, string> = {
  ok: 'OK',
  warn: 'Watch',
  critical: 'Alert',
  unknown: '—',
};

const WATCH_STATUS_TEXT: Record<WatchStatus, string> = {
  ok: 'text-emerald-300/90',
  warn: 'text-amber-300/90',
  critical: 'text-red-300/90',
  unknown: 'text-muted',
};

function OverviewHealthWatch({
  items,
  onInspectTab,
}: {
  items: WatchItem[];
  onInspectTab: (tab: DashboardTabId) => void;
}) {
  const {banner, bannerTone, criticalCount} = healthWatchSummary(items);
  const bannerClass =
    bannerTone === 'ok'
      ? 'text-emerald-300/90'
      : bannerTone === 'muted'
        ? 'text-muted'
        : criticalCount > 0
          ? 'text-red-300/90'
          : 'text-amber-300/90';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={cn(sectionLabelClass)}>Health watch</p>
        <p className={cn('text-xs font-semibold', bannerClass)}>{banner}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const interactive = Boolean(item.tab);
          const Tag = interactive ? 'button' : 'div';
          return (
            <Tag
              key={item.id}
              type={interactive ? 'button' : undefined}
              className={cn(
                'rounded-lg border border-l-4 bg-surface/60 p-4 text-left',
                WATCH_STATUS_BORDER[item.status],
                interactive &&
                  'cursor-pointer transition hover:bg-surface/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400/50',
              )}
              onClick={interactive ? () => onInspectTab(item.tab as DashboardTabId) : undefined}
            >
              <div className="flex items-start justify-between gap-2">
                <p className={cn(sectionLabelClass, 'mb-2')}>{item.label}</p>
                <span
                  className={cn(
                    'text-[10px] font-bold uppercase tracking-widest',
                    WATCH_STATUS_TEXT[item.status],
                  )}
                >
                  {WATCH_STATUS_LABEL[item.status]}
                </span>
              </div>
              <p className="text-2xl font-bold tabular-nums text-white">{item.value}</p>
              <p className="mt-1 text-xs text-muted">{item.hint}</p>
              {interactive ? (
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Open {item.tab} →
                </p>
              ) : null}
            </Tag>
          );
        })}
      </div>
    </div>
  );
}

function DashboardSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="border-b border-white/10 pb-3">
        <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-100">{title}</h2>
        {description ? <p className="mt-1 max-w-3xl text-xs text-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function DashboardTabBar({
  activeTab,
  onChange,
}: {
  activeTab: DashboardTabId;
  onChange: (tab: DashboardTabId) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Dashboard sections"
      className="flex gap-1 overflow-x-auto border-b border-white/10"
    >
      {DASHBOARD_TABS.map((tab) => {
        const selected = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`analytics-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`analytics-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            className={cn(
              'shrink-0 border-b-2 px-3 py-2.5 text-xs font-semibold transition',
              selected
                ? 'border-amber-400 text-white'
                : 'border-transparent text-slate-400 hover:border-white/20 hover:text-slate-200',
            )}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
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
    <div className="rounded-lg border border-white/10 bg-surface/40 p-4">
      <h3 className={cn(sectionLabelClass, 'mb-3')}>{title}</h3>
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
    </div>
  );
}

function DataTable({
  title,
  emptyLabel,
  children,
}: {
  title: string;
  emptyLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-surface/40 p-4">
      <h3 className={cn(sectionLabelClass, 'mb-3')}>{title}</h3>
      {children ? (
        <div className="overflow-x-auto">{children}</div>
      ) : (
        <p className="text-sm text-muted">{emptyLabel}</p>
      )}
    </div>
  );
}

function NotificationSection({
  notifications,
  dmEnabledRate,
}: {
  notifications: NotificationDashboard;
  dmEnabledRate: number | null;
}) {
  const backlogTotal =
    (notifications.backlog.pending ?? 0) + (notifications.backlog.processing ?? 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Delivery rate"
          value={formatRate(notifications.delivery.rate)}
          hint={`${formatNumber(notifications.delivery.sent)} sent · ${formatNumber(notifications.delivery.failed)} failed`}
        />
        <StatCard
          label="Outbox rows"
          value={formatNumber(notifications.outbox_in_window)}
          hint="Created in window"
        />
        <StatCard
          label="Queue backlog"
          value={formatNumber(backlogTotal)}
          hint={`${formatNumber(notifications.backlog.pending)} pending · ${formatNumber(notifications.backlog.processing)} processing`}
        />
        <StatCard
          label="Users with DMs on"
          value={dmEnabledRate !== null ? `${dmEnabledRate}%` : '—'}
          hint={`${formatNumber(notifications.dm_prefs.enabled)} on · ${formatNumber(notifications.dm_prefs.disabled)} off`}
        />
      </div>

      <div>
        <p className={cn(sectionLabelClass, 'mb-3')}>Delivery breakdown</p>
        <div className="grid gap-4 lg:grid-cols-2">
          <KeyValueTable title="By status" rows={recordRows(notifications.by_status)} />
          <KeyValueTable
            title="Sent by kind"
            rows={recordRows(notifications.by_kind_sent)}
            labelMap={NOTIFICATION_KIND_LABELS}
            emptyLabel="No sent rows in window"
          />
          <KeyValueTable
            title="All rows by kind"
            rows={recordRows(notifications.by_kind)}
            labelMap={NOTIFICATION_KIND_LABELS}
            emptyLabel="No outbox rows in window"
          />
          <KeyValueTable
            title="Skip reasons"
            rows={recordRows(notifications.skip_reasons)}
            emptyLabel="No skipped rows in window"
          />
        </div>
      </div>

      <div>
        <p className={cn(sectionLabelClass, 'mb-3')}>Profile bell (client)</p>
        <div className="grid gap-4 lg:grid-cols-3">
          <KeyValueTable
            title="Toggle events"
            rows={[
              {key: 'dm_enable', value: notifications.client_prefs.dm_enable},
              {key: 'dm_disable', value: notifications.client_prefs.dm_disable},
              {
                key: 'dm_enable_blocked_bot_install',
                value: notifications.client_prefs.dm_enable_blocked_bot_install,
              },
            ]}
            labelMap={{
              dm_enable: 'Turned on',
              dm_disable: 'Turned off',
              dm_enable_blocked_bot_install: 'Add bot (DM blocked)',
            }}
          />
        </div>
      </div>

      <DataTable title="Recent failures" emptyLabel="No failed deliveries in this window.">
        {notifications.recent_failures.length > 0 ? (
          <table className="w-full min-w-[36rem] text-sm">
            <thead>
              <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-muted">
                <th className="pb-2 pr-3">Time</th>
                <th className="pb-2 pr-3">Kind</th>
                <th className="pb-2 pr-3">Error</th>
                <th className="pb-2 text-right">Attempts</th>
              </tr>
            </thead>
            <tbody>
              {notifications.recent_failures.map((row, index) => (
                <tr key={`${row.at}:${index}`} className="border-t border-white/5">
                  <td className="py-2 pr-3 whitespace-nowrap text-muted">
                    {new Date(row.at).toLocaleString()}
                  </td>
                  <td className="py-2 pr-3 text-slate-200">
                    {NOTIFICATION_KIND_LABELS[row.kind] ?? row.kind}
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs text-red-200/90">
                    {row.last_error ?? '—'}
                  </td>
                  <td className="py-2 text-right font-mono tabular-nums text-muted">
                    {formatNumber(row.attempts)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </DataTable>
    </div>
  );
}

export function AnalyticsDashboard() {
  const [days, setDays] = useState<number>(7);
  const [activeTab, setActiveTab] = useState<DashboardTabId>(readStoredTab);
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
  const notifications = summary?.notifications;
  const dmPrefsTotal =
    (notifications?.dm_prefs.enabled ?? 0) + (notifications?.dm_prefs.disabled ?? 0);
  const dmEnabledRate =
    dmPrefsTotal > 0 && notifications
      ? Math.round((100 * notifications.dm_prefs.enabled) / dmPrefsTotal)
      : null;
  const activeTabMeta = DASHBOARD_TABS.find((tab) => tab.id === activeTab) ?? DASHBOARD_TABS[0];
  const watchItems = summary
    ? buildWatchItems(summary, notifications, ingestFailureSummary)
    : [];

  const selectTab = (tab: DashboardTabId) => {
    setActiveTab(tab);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(ANALYTICS_TAB_KEY, tab);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-3 py-4 sm:px-5 md:px-8">
      <header className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300/90">
              Local dev only
            </p>
            <h1 className="text-2xl font-black tracking-tight text-white">Analytics dashboard</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              Product telemetry from <code className="text-slate-300">client_events</code> and
              Discord DM delivery from <code className="text-slate-300">notification_outbox</code>.
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
        </div>

        {summary ? (
          <DashboardTabBar activeTab={activeTab} onChange={selectTab} />
        ) : null}
      </header>

      {!configured ? (
        <div className="rounded-lg border border-amber-400/30 bg-amber-950/20 p-4 text-sm text-amber-100/90">
          <p className="font-semibold">Dashboard secret not configured</p>
          <p className="mt-2 text-amber-100/80">
            Set <code className="text-amber-50">ANALYTICS_DASHBOARD_SECRET</code> in{' '}
            <code className="text-amber-50">.env</code>, run{' '}
            <code className="text-amber-50">npm run sync:secrets</code>, apply migrations{' '}
            <code className="text-amber-50">023</code> + <code className="text-amber-50">026</code>,
            redeploy <code className="text-amber-50">analytics-dashboard</code>.
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
        <div
          role="tabpanel"
          id={`analytics-panel-${activeTab}`}
          aria-labelledby={`analytics-tab-${activeTab}`}
          aria-label={activeTabMeta.label}
          className="flex flex-col gap-6"
        >
          <DashboardSection title={activeTabMeta.label} description={activeTabMeta.description}>
            {activeTab === 'overview' ? (
              <>
                <OverviewHealthWatch items={watchItems} onInspectTab={selectTab} />

                <div>
                  <p className={cn(sectionLabelClass, 'mb-3')}>Volume</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard label="Sessions" value={formatNumber(summary.sessions)} />
                    <StatCard
                      label="Unique users"
                      value={formatNumber(summary.unique_users)}
                      hint="Discord ID only"
                    />
                    <StatCard
                      label="Client events"
                      value={formatNumber(summary.total_events)}
                      hint="Raw rows in client_events"
                    />
                    <StatCard
                      label="Event views"
                      value={formatNumber(summary.funnel.event_view ?? 0)}
                      hint={`${formatNumber(engagement?.sessions ?? 0)} sessions`}
                    />
                  </div>
                </div>

                <div>
                  <p className={cn(sectionLabelClass, 'mb-3')}>Conversion</p>
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
                      hint={`${formatNumber(engagement?.event_views ?? 0)} views`}
                    />
                  </div>
                </div>
              </>
            ) : null}

            {activeTab === 'surfaces' ? (
              <>
                <div className="grid gap-4 lg:grid-cols-2">
                  <KeyValueTable
                    title="Sessions by surface"
                    rows={recordRows(summary.sessions_by_surface)}
                  />
                  <KeyValueTable
                    title="Unique users by surface"
                    rows={recordRows(summary.unique_users_by_surface)}
                  />
                </div>
                {Object.keys(summary.funnel_by_surface ?? {}).length > 0 ? (
                  <div>
                    <p className={cn(sectionLabelClass, 'mb-3')}>Funnel by surface</p>
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
                  </div>
                ) : null}
              </>
            ) : null}

            {activeTab === 'funnel' ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {FUNNEL_GROUPS.map((group) => (
                    <KeyValueTable
                      key={group.title}
                      title={group.title}
                      rows={funnelGroupRows(summary.funnel, group.keys)}
                      labelMap={FUNNEL_LABELS}
                      emptyLabel="No events"
                    />
                  ))}
                  <KeyValueTable
                    title="Reliability"
                    rows={funnelGroupRows(summary.funnel, ['api_error'])}
                    labelMap={FUNNEL_LABELS}
                    emptyLabel="No API errors"
                  />
                </div>
                <KeyValueTable
                  title="Host actions (success only)"
                  rows={recordRows(summary.host_actions)}
                />
              </>
            ) : null}

            {activeTab === 'notifications' ? (
              notifications ? (
                <NotificationSection notifications={notifications} dmEnabledRate={dmEnabledRate} />
              ) : (
                <div className="rounded-lg border border-amber-400/20 bg-amber-950/10 p-4 text-sm text-amber-100/80">
                  Notification metrics unavailable — apply migration{' '}
                  <code className="text-amber-50">026</code> and refresh.
                </div>
              )
            ) : null}

            {activeTab === 'errors' ? (
              <>
                <div className="grid gap-4 lg:grid-cols-2">
                  <KeyValueTable
                    title="By surface"
                    rows={recordRows(summary.errors_by_surface)}
                    emptyLabel="No API errors in window"
                  />
                  <KeyValueTable
                    title="By Edge function"
                    rows={recordRows(summary.errors_by_function)}
                    emptyLabel="No API errors in window"
                  />
                </div>

                <DataTable title="Top API errors" emptyLabel="No API errors in this window.">
                  {summary.top_errors.length > 0 ? (
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
                  ) : null}
                </DataTable>

                <DataTable title="Recent errors" emptyLabel="No recent errors.">
                  {summary.recent_errors.length > 0 ? (
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
                  ) : null}
                </DataTable>
              </>
            ) : null}

            {activeTab === 'trends' ? (
              <div className="grid gap-4 xl:grid-cols-2">
                <DataTable title="Client events by day" emptyLabel="No events in this window.">
                  {summary.daily.length > 0 ? (
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
                  ) : null}
                </DataTable>

                {notifications ? (
                  <DataTable title="DM outbox by day" emptyLabel="No outbox rows in this window.">
                    {notifications.daily.length > 0 ? (
                      <table className="w-full min-w-[28rem] text-sm">
                        <thead>
                          <tr className="text-left text-[10px] font-bold uppercase tracking-widest text-muted">
                            <th className="pb-2 pr-3">Day</th>
                            <th className="pb-2 pr-3 text-right">Sent</th>
                            <th className="pb-2 pr-3 text-right">Failed</th>
                            <th className="pb-2 text-right">Skipped</th>
                          </tr>
                        </thead>
                        <tbody>
                          {notifications.daily.map((row) => (
                            <tr key={row.day} className="border-t border-white/5">
                              <td className="py-2 pr-3 text-slate-200">{row.day}</td>
                              <td className="py-2 pr-3 text-right font-mono tabular-nums text-emerald-300/80">
                                {formatNumber(row.sent)}
                              </td>
                              <td className="py-2 pr-3 text-right font-mono tabular-nums text-red-300/80">
                                {formatNumber(row.failed)}
                              </td>
                              <td className="py-2 text-right font-mono tabular-nums text-muted">
                                {formatNumber(row.skipped)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : null}
                  </DataTable>
                ) : (
                  <div className="rounded-lg border border-amber-400/20 bg-amber-950/10 p-4 text-sm text-amber-100/80">
                    DM daily volume unavailable — apply migration{' '}
                    <code className="text-amber-50">026</code> and refresh.
                  </div>
                )}
              </div>
            ) : null}
          </DashboardSection>

          <p className="text-xs text-muted">
            Window since {new Date(summary.since).toLocaleString()} ({summary.days} day
            {summary.days === 1 ? '' : 's'}).
          </p>
        </div>
      ) : loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : null}
    </div>
  );
}
