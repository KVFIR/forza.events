import type {
  AnalyticsDashboardSummary,
  ConversionMetric,
  NotificationDashboard,
} from './analyticsDashboard';

export type WatchStatus = 'ok' | 'warn' | 'critical' | 'unknown';

export type HealthWatchTab = 'funnel' | 'errors' | 'notifications';

export type WatchItem = {
  id: string;
  label: string;
  value: string;
  hint: string;
  status: WatchStatus;
  tab?: HealthWatchTab;
};

function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}

function formatRate(rate: number | null | undefined): string {
  if (rate === null || rate === undefined) return '—';
  return `${rate}%`;
}

export function conversionWatchStatus(metric: ConversionMetric | undefined): WatchStatus {
  if (!metric) return 'unknown';
  const attempts = metric.success + metric.failed;
  if (attempts === 0) return 'unknown';
  if (metric.failed >= 3 && (metric.rate === null || metric.rate < 80)) return 'critical';
  if (metric.failed > 0 && (metric.rate === null || metric.rate < 95)) return 'warn';
  return 'ok';
}

/** ponytail: scale fixed thresholds by window length — upgrade to per-surface baselines if noise grows. */
export function apiErrorWatchStatus(count: number, days: number): WatchStatus {
  if (count === 0) return 'ok';
  const criticalCap = Math.max(8, days * 3);
  if (count > criticalCap) return 'critical';
  return 'warn';
}

export function healthWatchSummary(items: WatchItem[]): {
  alerts: WatchItem[];
  criticalCount: number;
  banner: string;
  bannerTone: 'ok' | 'warn' | 'muted';
} {
  const alerts = items.filter((item) => item.status === 'warn' || item.status === 'critical');
  const criticalCount = items.filter((item) => item.status === 'critical').length;
  if (alerts.length > 0) {
    return {
      alerts,
      criticalCount,
      banner: `${alerts.length} item${alerts.length === 1 ? '' : 's'} need attention`,
      bannerTone: criticalCount > 0 ? 'warn' : 'warn',
    };
  }
  const meaningful = items.filter(
    (item) => item.status !== 'unknown' && !(item.id === 'api_errors' && item.status === 'ok'),
  );
  if (meaningful.length === 0) {
    return {
      alerts,
      criticalCount,
      banner: 'No signals in this window',
      bannerTone: 'muted',
    };
  }
  return {
    alerts,
    criticalCount,
    banner: 'All clear',
    bannerTone: 'ok',
  };
}

export function buildWatchItems(
  summary: AnalyticsDashboardSummary,
  notifications: NotificationDashboard | undefined,
  ingestFailureSummary: string | null,
): WatchItem[] {
  const items: WatchItem[] = [];
  const joinConv = summary.conversion?.join;
  const authConv = summary.conversion?.auth;
  const publishConv = summary.conversion?.publish;
  const joins = summary.funnel.join ?? 0;
  const publishes = summary.host_actions.publish ?? summary.funnel.publish ?? 0;
  const apiErrors = summary.funnel.api_error ?? 0;
  const topError = summary.top_errors[0];

  if (ingestFailureSummary) {
    items.push({
      id: 'ingest',
      label: 'Client ingest',
      value: 'Failing',
      hint: ingestFailureSummary,
      status: 'critical',
    });
  }

  if (!notifications) {
    items.push({
      id: 'dm_metrics',
      label: 'DM metrics',
      value: '—',
      hint: 'Apply migration 026 and refresh',
      status: 'unknown',
      tab: 'notifications',
    });
  }

  items.push({
    id: 'joins',
    label: 'Joins',
    value: formatNumber(joins),
    hint:
      joinConv && joinConv.success + joinConv.failed > 0
        ? `${formatRate(joinConv.rate)} success · ${formatNumber(joinConv.failed)} failed`
        : joins > 0
          ? `${formatNumber(joins)} in funnel`
          : 'No joins in window',
    status: conversionWatchStatus(joinConv),
    tab: 'funnel',
  });

  items.push({
    id: 'publishes',
    label: 'Publishes',
    value: formatNumber(publishes),
    hint:
      publishConv && publishConv.success + publishConv.failed > 0
        ? `${formatRate(publishConv.rate)} success · ${formatNumber(publishConv.failed)} failed`
        : publishes > 0
          ? `${formatNumber(publishes)} published`
          : 'No publishes in window',
    status: conversionWatchStatus(publishConv),
    tab: 'funnel',
  });

  items.push({
    id: 'api_errors',
    label: 'API errors',
    value: formatNumber(apiErrors),
    hint: topError
      ? `${topError.code}${topError.function_name ? ` · ${topError.function_name}` : ''} (${formatNumber(topError.count)})`
      : apiErrors > 0
        ? 'See Errors tab'
        : 'No API errors',
    status: apiErrorWatchStatus(apiErrors, summary.days),
    tab: 'errors',
  });

  items.push({
    id: 'auth',
    label: 'Auth',
    value:
      authConv && authConv.success + authConv.failed > 0
        ? formatRate(authConv.rate)
        : '—',
    hint:
      authConv && authConv.success + authConv.failed > 0
        ? `${formatNumber(authConv.success)} ok · ${formatNumber(authConv.failed)} failed`
        : 'No auth attempts',
    status: conversionWatchStatus(authConv),
    tab: 'funnel',
  });

  if (notifications) {
    const backlog =
      (notifications.backlog.pending ?? 0) + (notifications.backlog.processing ?? 0);
    const dmAttempts = notifications.delivery.sent + notifications.delivery.failed;

    items.push({
      id: 'dm_delivery',
      label: 'DM delivery',
      value: dmAttempts > 0 ? formatRate(notifications.delivery.rate) : '—',
      hint:
        dmAttempts > 0
          ? `${formatNumber(notifications.delivery.sent)} sent · ${formatNumber(notifications.delivery.failed)} failed`
          : 'No terminal DM rows in window',
      status:
        dmAttempts === 0
          ? 'unknown'
          : notifications.delivery.failed === 0
            ? 'ok'
            : notifications.delivery.failed >= 3 ||
                (notifications.delivery.rate !== null && notifications.delivery.rate < 95)
              ? 'critical'
              : 'warn',
      tab: 'notifications',
    });

    items.push({
      id: 'dm_backlog',
      label: 'DM queue',
      value: formatNumber(backlog),
      hint: `${formatNumber(notifications.backlog.pending)} pending · ${formatNumber(notifications.backlog.processing)} processing`,
      status: backlog === 0 ? 'ok' : backlog <= 20 ? 'warn' : 'critical',
      tab: 'notifications',
    });
  }

  return items;
}
