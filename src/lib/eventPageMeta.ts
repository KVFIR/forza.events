import type {PageMeta} from './pageMeta';
import {SITE_NAME} from './pageMeta';
import type {EventType, ForzaEvent} from './types';

export {SITE_NAME};
export type EventPageMeta = PageMeta;

export const DEFAULT_COVER_BY_TYPE: Record<EventType, string> = {
  road: '/covers/cover-road-2.webp',
  dirt: '/covers/cover-dirt-1.webp',
  cruise: '/covers/cover-cruise-1.webp',
};

const BUNDLED_DEFAULT_COVER_PATHS = new Set(Object.values(DEFAULT_COVER_BY_TYPE));

export const EVENT_TYPE_LABEL_EN: Record<EventType, string> = {
  road: 'Road racing',
  dirt: 'Dirt racing',
  cruise: 'Cruise',
};

type EventMetaInput = Pick<
  ForzaEvent,
  | 'id'
  | 'title'
  | 'type'
  | 'startsAt'
  | 'coverImageUrl'
  | 'lifecycle'
>;

function normalizeEventType(type: string | undefined | null): EventType {
  if (type && type in EVENT_TYPE_LABEL_EN) return type as EventType;
  return 'road';
}

function isBundledDefaultCover(url: string | null | undefined): boolean {
  const trimmed = url?.trim();
  if (!trimmed) return false;
  if (BUNDLED_DEFAULT_COVER_PATHS.has(trimmed)) return true;
  try {
    const pathname = trimmed.startsWith('http') ? new URL(trimmed).pathname : trimmed;
    return BUNDLED_DEFAULT_COVER_PATHS.has(pathname);
  } catch {
    return false;
  }
}

export function resolveEventCoverAbsolute(
  type: EventType,
  coverImageUrl: string | null | undefined,
  siteOrigin: string,
): string {
  const normalizedType = normalizeEventType(type);
  const custom = coverImageUrl?.trim();
  const path =
    custom && !isBundledDefaultCover(custom)
      ? custom
      : (DEFAULT_COVER_BY_TYPE[normalizedType] ?? DEFAULT_COVER_BY_TYPE.road);
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = siteOrigin.replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function formatEventOgDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  })} UTC`;
}

function lifecycleSuffix(lifecycle: ForzaEvent['lifecycle']): string {
  if (lifecycle === 'cancelled') return ' · Cancelled';
  if (lifecycle === 'completed' || lifecycle === 'archived') return ' · Completed';
  return '';
}

export function buildEventPageMeta(
  event: EventMetaInput,
  options?: {siteOrigin?: string; pageUrl?: string; isResults?: boolean},
): PageMeta {
  const origin = (options?.siteOrigin ?? 'https://forza.events').replace(/\/$/, '');
  const url =
    options?.pageUrl ?? `${origin}/event/${event.id}${options?.isResults ? '/results' : ''}`;
  const typeLabel = EVENT_TYPE_LABEL_EN[normalizeEventType(event.type)];
  const when = formatEventOgDate(event.startsAt);
  const suffix = lifecycleSuffix(event.lifecycle);

  const titleBase = event.title.trim() || 'Event';
  const title = options?.isResults ? `${titleBase} · Results` : titleBase;

  const parts = [typeLabel];
  if (when) parts.push(when);
  const description = `${parts.join(' · ')}${suffix}`;

  return {
    title,
    description,
    image: resolveEventCoverAbsolute(event.type, event.coverImageUrl, origin),
    url,
    siteName: SITE_NAME,
  };
}
