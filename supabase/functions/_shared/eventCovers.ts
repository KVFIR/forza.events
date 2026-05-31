const DEFAULT_COVER_BY_TYPE: Record<string, string> = {
  road: '/covers/cover-road-2.webp',
  dirt: '/covers/cover-dirt-1.webp',
  cruise: '/covers/cover-cruise-1.webp',
};

const BUNDLED_DEFAULT_COVER_PATHS = new Set(Object.values(DEFAULT_COVER_BY_TYPE));

export function defaultCoverPath(type: string): string {
  return DEFAULT_COVER_BY_TYPE[type] ?? DEFAULT_COVER_BY_TYPE.road;
}

function isBundledDefaultCover(url: string): boolean {
  const trimmed = url.trim();
  if (BUNDLED_DEFAULT_COVER_PATHS.has(trimmed)) return true;
  try {
    const pathname = trimmed.startsWith('http') ? new URL(trimmed).pathname : trimmed;
    return BUNDLED_DEFAULT_COVER_PATHS.has(pathname);
  } catch {
    return false;
  }
}

export function resolveCoverUrl(type: string, coverImageUrl?: string | null): string {
  const custom = coverImageUrl?.trim();
  if (custom && !isBundledDefaultCover(custom)) return custom;
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
