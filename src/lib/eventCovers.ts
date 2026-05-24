import type {EventType} from './types';

/** Bundled default covers (public/covers). Road uses cover-road-2. */
export const DEFAULT_COVER_BY_TYPE: Record<EventType, string> = {
  road: '/covers/cover-road-2.jpg',
  dirt: '/covers/cover-dirt-1.jpg',
  drift: '/covers/cover-drift-1.jpg',
  touge: '/covers/cover-touge-1.jpg',
};

export function defaultCoverPath(type: EventType): string {
  return DEFAULT_COVER_BY_TYPE[type] ?? DEFAULT_COVER_BY_TYPE.road;
}

/** Custom upload wins; otherwise type default from repo. */
export function resolveEventCoverUrl(type: EventType, coverImageUrl?: string | null): string {
  const custom = coverImageUrl?.trim();
  if (custom) return custom;
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
