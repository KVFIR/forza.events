import type {EventType} from './types';

/** Bundled default covers (public/covers, WebP). Road uses cover-road-2. */
export const DEFAULT_COVER_BY_TYPE: Record<EventType, string> = {
  road: '/covers/cover-road-2.webp',
  dirt: '/covers/cover-dirt-1.webp',
  drift: '/covers/cover-drift-1.webp',
  touge: '/covers/cover-touge-1.webp',
  cruise: '/covers/cover-cruise-1.webp',
};

const BUNDLED_DEFAULT_COVER_PATHS = new Set(Object.values(DEFAULT_COVER_BY_TYPE));

export function defaultCoverPath(type: EventType): string {
  return DEFAULT_COVER_BY_TYPE[type] ?? DEFAULT_COVER_BY_TYPE.road;
}

/** True when the URL is a repo default cover (any event type), not a custom upload. */
export function isBundledDefaultCover(url: string | null | undefined): boolean {
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

/** Custom upload wins; bundled defaults follow the current type. */
export function resolveEventCoverUrl(type: EventType, coverImageUrl?: string | null): string {
  const custom = coverImageUrl?.trim();
  if (custom && !isBundledDefaultCover(custom)) return custom;
  return defaultCoverPath(type);
}

/** Absolute URL for Discord embeds and external consumers. */
export function resolveEventCoverAbsolute(
  type: EventType,
  coverImageUrl: string | null | undefined,
  siteOrigin: string,
): string {
  const path = resolveEventCoverUrl(type, coverImageUrl);
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = siteOrigin.replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
