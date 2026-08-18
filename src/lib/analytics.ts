import {ApiRequestError} from './apiErrors';
import {getDiscordAccessToken} from './discord';
import {ensureDiscordSupabaseProxy} from './discordUrlProxy';
import {CLIENT_SURFACE_HEADER, resolveClientSurface} from './clientSurface';
import {createSupabaseFetch, isDiscordActivityFrame, resolveSupabaseUrl} from './supabaseEnv';

export const ANALYTICS_TRACK_SECRET_HEADER = 'x-analytics-track-secret';

export type AnalyticsOutcome = 'success' | 'error' | 'unchanged';

export type AnalyticsEventInput = {
  name: string;
  outcome?: AnalyticsOutcome;
  api_code?: string;
  http_status?: number;
  function_name?: string;
  event_id?: string;
  meta?: Record<string, string | number | boolean>;
};

type QueuedEvent = AnalyticsEventInput;

const AUTH_SUCCESS_KEY = 'forza.analytics.auth';
const INGEST_FAIL_KEY = 'forza.analytics.ingest_failures';
const FLUSH_MS = 2_000;
const MAX_BATCH = 20;

const queue: QueuedEvent[] = [];
let flushTimer: number | null = null;
let flushing = false;

function analyticsEnabled(): boolean {
  if (import.meta.env.VITE_ANALYTICS === 'false') return false;
  return Boolean(
    (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || resolveSupabaseUrl(),
  );
}

function trackSecret(): string {
  return (import.meta.env.VITE_ANALYTICS_TRACK_SECRET as string | undefined)?.trim() ?? '';
}

function readIngestFailureStore(): Record<string, number> {
  if (typeof sessionStorage === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(INGEST_FAIL_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, number> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        out[key] = Math.trunc(value);
      }
    }
    return out;
  } catch {
    return {};
  }
}

function recordIngestFailure(status: number | 'network'): void {
  if (typeof sessionStorage === 'undefined') return;
  const counts = readIngestFailureStore();
  const key = status === 'network' ? 'network' : String(status);
  counts[key] = (counts[key] ?? 0) + 1;
  sessionStorage.setItem(INGEST_FAIL_KEY, JSON.stringify(counts));
}

/** Failed track-event batches in this browser tab (sessionStorage). */
export function readIngestFailureCounts(): Record<string, number> {
  return readIngestFailureStore();
}

export function clearIngestFailureCounts(): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(INGEST_FAIL_KEY);
}

export function formatIngestFailureSummary(counts: Record<string, number>): string | null {
  const entries = Object.entries(counts).filter(([, n]) => n > 0);
  if (entries.length === 0) return null;
  return entries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => `${count}× ${key}`)
    .join(', ');
}

function apiBase(): string {
  const explicit = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (explicit?.trim()) return explicit.trim().replace(/\/$/, '');
  const url = resolveSupabaseUrl();
  if (url) return `${url}/functions/v1`;
  return '';
}

function scheduleFlush(): void {
  if (typeof window === 'undefined') return;
  if (flushTimer !== null) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    void flushAnalytics();
  }, FLUSH_MS);
}

async function postBatch(events: QueuedEvent[]): Promise<void> {
  const base = apiBase();
  if (!base || events.length === 0) return;

  if (isDiscordActivityFrame()) {
    await ensureDiscordSupabaseProxy();
  }

  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) ?? '';
  const headers = new Headers({
    'Content-Type': 'application/json',
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    [CLIENT_SURFACE_HEADER]: resolveClientSurface(),
  });
  const secret = trackSecret();
  if (secret) {
    headers.set(ANALYTICS_TRACK_SECRET_HEADER, secret);
  }
  const discordAccessToken = getDiscordAccessToken();
  if (discordAccessToken) {
    headers.set('x-discord-access-token', discordAccessToken);
  }

  const doFetch = createSupabaseFetch(anonKey) ?? fetch;

  try {
    const res = await doFetch(`${base}/track-event`, {
      method: 'POST',
      headers,
      body: JSON.stringify({events}),
      keepalive: true,
    });
    if (!res.ok) {
      recordIngestFailure(res.status);
      if (import.meta.env.DEV || res.status === 403) {
        console.warn('[analytics] track-event failed', res.status, events.length);
      }
    }
  } catch {
    recordIngestFailure('network');
    // ponytail: best-effort analytics — never block product flows
    if (import.meta.env.DEV) {
      console.warn('[analytics] track-event network error', events.length);
    }
  }
}

function drainQueueOnPageHide(): void {
  if (queue.length === 0) return;
  const pending = queue.splice(0, queue.length);
  for (let offset = 0; offset < pending.length; offset += MAX_BATCH) {
    void postBatch(pending.slice(offset, offset + MAX_BATCH));
  }
}

export async function flushAnalytics(): Promise<void> {
  if (!analyticsEnabled() || flushing || queue.length === 0) return;
  flushing = true;
  try {
    while (queue.length > 0) {
      const batch = queue.splice(0, MAX_BATCH);
      await postBatch(batch);
    }
  } finally {
    flushing = false;
  }
}

export function track(name: string, props: Omit<AnalyticsEventInput, 'name'> = {}): void {
  if (!analyticsEnabled()) return;
  queue.push({name, ...props});
  scheduleFlush();
}

export function trackOnce(storageKey: string, name: string, props: Omit<AnalyticsEventInput, 'name'> = {}): void {
  if (typeof sessionStorage === 'undefined') {
    track(name, props);
    return;
  }
  if (sessionStorage.getItem(storageKey)) return;
  sessionStorage.setItem(storageKey, '1');
  track(name, props);
}

export function trackOncePerSession(
  name: string,
  props: Omit<AnalyticsEventInput, 'name'> = {},
): void {
  trackOnce(`forza.analytics.${name}`, name, props);
}

export function trackSessionStart(): void {
  trackOncePerSession('session_start');
}

export function trackAuthSuccessOnce(): void {
  if (typeof sessionStorage === 'undefined') return;
  if (sessionStorage.getItem(AUTH_SUCCESS_KEY)) return;
  sessionStorage.setItem(AUTH_SUCCESS_KEY, '1');
  track('auth_success', {outcome: 'success'});
}

export function trackApiError(
  functionName: string,
  error: ApiRequestError,
  options?: {
    eventId?: string;
    meta?: Record<string, string | number | boolean>;
  },
): void {
  track('api_error', {
    outcome: 'error',
    function_name: functionName,
    api_code: error.code,
    http_status: error.status || undefined,
    event_id: options?.eventId,
    meta: options?.meta,
  });
}

export function trackNetworkError(
  functionName: string,
  options?: {
    eventId?: string;
    meta?: Record<string, string | number | boolean>;
  },
): void {
  track('api_error', {
    outcome: 'error',
    function_name: functionName,
    api_code: 'NETWORK_ERROR',
    http_status: 0,
    event_id: options?.eventId,
    meta: options?.meta,
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', drainQueueOnPageHide);
}
