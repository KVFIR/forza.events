const DEFAULT_COVER_BY_TYPE: Record<string, string> = {
  road: '/covers/cover-road-2.jpg',
  dirt: '/covers/cover-dirt-1.jpg',
  drift: '/covers/cover-drift-1.jpg',
  touge: '/covers/cover-touge-1.jpg',
};

export function defaultCoverPath(type: string): string {
  return DEFAULT_COVER_BY_TYPE[type] ?? DEFAULT_COVER_BY_TYPE.road;
}

export function resolveCoverUrl(type: string, coverImageUrl?: string | null): string {
  const custom = coverImageUrl?.trim();
  if (custom) return custom;
  return defaultCoverPath(type);
}

export function resolveCoverAbsolute(
  type: string,
  coverImageUrl: string | null | undefined,
  siteOrigin: string,
): string {
  const path = resolveCoverUrl(type, coverImageUrl);
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = siteOrigin.replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
