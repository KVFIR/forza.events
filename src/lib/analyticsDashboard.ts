import {ensureDiscordSupabaseProxy} from './discordUrlProxy';
import {createSupabaseFetch, isDiscordActivityFrame, resolveSupabaseUrl} from './supabaseEnv';

export const ANALYTICS_DASHBOARD_SECRET_HEADER = 'x-analytics-dashboard-secret';

export type ConversionMetric = {
  success: number;
  failed: number;
  rate: number | null;
};

export type EventViewsPerSessionMetric = {
  sessions: number;
  event_views: number;
  avg: number | null;
};

export type AnalyticsDashboardSummary = {
  days: number;
  since: string;
  total_events: number;
  unique_users: number;
  sessions: number;
  by_surface: Record<string, number>;
  unique_users_by_surface: Record<string, number>;
  sessions_by_surface: Record<string, number>;
  funnel: Record<string, number>;
  funnel_by_surface: Record<string, Record<string, number>>;
  conversion: {
    auth: ConversionMetric;
    join: ConversionMetric;
    publish: ConversionMetric;
    event_views_per_session: EventViewsPerSessionMetric;
  };
  host_actions: Record<string, number>;
  top_errors: {code: string; function_name: string | null; count: number}[];
  errors_by_surface: Record<string, number>;
  errors_by_function: Record<string, number>;
  recent_errors: {
    at: string;
    surface: string;
    code: string;
    function_name: string | null;
    http_status: number | null;
    event_id: string | null;
  }[];
  daily: {day: string; events: number; users: number; errors: number}[];
};

function apiBase(): string {
  const explicit = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (explicit?.trim()) return explicit.trim().replace(/\/$/, '');
  const url = resolveSupabaseUrl();
  if (url) return `${url}/functions/v1`;
  return '';
}

function dashboardSecret(): string {
  const secret = import.meta.env.VITE_ANALYTICS_DASHBOARD_SECRET as string | undefined;
  return secret?.trim() ?? '';
}

export function isAnalyticsDashboardConfigured(): boolean {
  return Boolean(dashboardSecret() && apiBase());
}

export async function fetchAnalyticsDashboard(
  days: number,
): Promise<AnalyticsDashboardSummary> {
  const secret = dashboardSecret();
  const base = apiBase();
  if (!secret) {
    throw new Error('Set ANALYTICS_DASHBOARD_SECRET in .env and run npm run sync:secrets');
  }
  if (!base) throw new Error('Supabase API is not configured');

  if (isDiscordActivityFrame()) {
    await ensureDiscordSupabaseProxy();
  }

  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ?? '';
  const headers = new Headers({
    'Content-Type': 'application/json',
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    [ANALYTICS_DASHBOARD_SECRET_HEADER]: secret,
  });

  const doFetch = isDiscordActivityFrame()
    ? (createSupabaseFetch(anonKey) ?? fetch)
    : fetch;

  const res = await doFetch(`${base}/analytics-dashboard`, {
    method: 'POST',
    headers,
    body: JSON.stringify({days}),
  });

  const payload = (await res.json().catch(() => ({}))) as {
    error?: string;
    summary?: AnalyticsDashboardSummary;
  };

  if (!res.ok) {
    throw new Error(payload.error ?? `Dashboard request failed: ${res.status}`);
  }
  if (!payload.summary) {
    throw new Error('Invalid dashboard response');
  }
  return payload.summary;
}
