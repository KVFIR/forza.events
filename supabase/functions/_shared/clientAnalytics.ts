import type {ClientSurface} from './clientSurface.ts';

const EVENT_NAME_RE = /^[a-z][a-z0-9_]{0,63}$/;

/** Closed set — reject unknown client event names (spam protection). */
export const ALLOWED_CLIENT_EVENT_NAMES = new Set<string>([
  'session_start',
  'auth_success',
  'auth_failed',
  'session_expired',
  'browse_view',
  'event_view',
  'create_open',
  'join',
  'leave',
  'publish',
  'draft_save',
  'cancel_event',
  'submit_results',
  'add_group',
  'change_group_leader',
  'bot_install_click',
  'notification_dm_enable',
  'notification_dm_disable',
  'empty_guild_list',
  'api_error',
]);
const MAX_META_KEYS = 10;
const MAX_META_STRING = 200;

export type IncomingClientEvent = {
  name?: unknown;
  outcome?: unknown;
  api_code?: unknown;
  http_status?: unknown;
  function_name?: unknown;
  event_id?: unknown;
  meta?: unknown;
};

export type ClientEventRow = {
  surface: ClientSurface;
  event_name: string;
  outcome: string | null;
  api_code: string | null;
  http_status: number | null;
  function_name: string | null;
  discord_id: string | null;
  event_id: string | null;
  meta: Record<string, string | number | boolean>;
};

function trimText(value: unknown, maxLen: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLen);
}

function parseUuid(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmed)
    ? trimmed
    : null;
}

function parseHttpStatus(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null;
  if (value < 100 || value > 599) return null;
  return value;
}

function parseOutcome(value: unknown): string | null {
  if (value === 'success' || value === 'error') return value;
  return null;
}

function sanitizeMeta(value: unknown): Record<string, string | number | boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, string | number | boolean> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    if (Object.keys(out).length >= MAX_META_KEYS) break;
    if (!/^[a-z][a-z0-9_]{0,31}$/.test(key)) continue;
    if (typeof raw === 'string') {
      out[key] = raw.slice(0, MAX_META_STRING);
    } else if (typeof raw === 'number' && Number.isFinite(raw)) {
      out[key] = raw;
    } else if (typeof raw === 'boolean') {
      out[key] = raw;
    }
  }
  return out;
}

export function normalizeClientEvent(
  raw: IncomingClientEvent,
  surface: ClientSurface,
  discordId: string | null,
): ClientEventRow | null {
  const name = trimText(raw.name, 64);
  if (!name || !EVENT_NAME_RE.test(name) || !ALLOWED_CLIENT_EVENT_NAMES.has(name)) return null;

  return {
    surface,
    event_name: name,
    outcome: parseOutcome(raw.outcome),
    api_code: trimText(raw.api_code, 64),
    http_status: parseHttpStatus(raw.http_status),
    function_name: trimText(raw.function_name, 64),
    discord_id: discordId,
    event_id: parseUuid(raw.event_id),
    meta: sanitizeMeta(raw.meta),
  };
}
