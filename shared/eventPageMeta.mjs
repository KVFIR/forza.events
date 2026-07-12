/** Shared event page meta — keep in sync with `src/lib/eventPageMeta.ts` wrappers. */

export const SITE_NAME = 'FORZA.EVENTS';

/** Keep in sync with `src/lib/constants.ts` (`LOBBY_TOTAL_PLAYERS`). */
export const LOBBY_TOTAL_PLAYERS = 12;

export const DEFAULT_COVER_BY_TYPE = {
  road: '/covers/cover-road-2.webp',
  dirt: '/covers/cover-dirt-1.webp',
  cruise: '/covers/cover-cruise-1.webp',
};

const BUNDLED_DEFAULT_COVER_PATHS = new Set(Object.values(DEFAULT_COVER_BY_TYPE));

export const EVENT_TYPE_LABEL_EN = {
  road: 'Road racing',
  dirt: 'Dirt racing',
  cruise: 'Cruise',
};

export const EVENT_PATH_RE =
  /^\/event\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:\/results)?\/?$/i;

const CRAWLER_UA_RE =
  /bot|facebookexternalhit|discordbot|slackbot|telegrambot|twitterbot|linkedinbot|whatsapp|embedly|pinterest|applebot|bingbot|bingpreview|skypeuripreview|vkshare|redditbot/i;

export function parseEventPagePath(pathname) {
  const m = pathname.match(EVENT_PATH_RE);
  if (!m) return null;
  return {eventId: m[1], isResults: /\/results\/?$/i.test(pathname)};
}

export function isLinkPreviewCrawler(userAgent) {
  if (!userAgent) return false;
  return CRAWLER_UA_RE.test(userAgent);
}

function normalizeEventType(type) {
  return type && EVENT_TYPE_LABEL_EN[type] ? type : 'road';
}

function isBundledDefaultCover(url) {
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

/** Absolute cover URL for OG / Twitter cards (external crawlers). */
export function resolveEventCoverAbsolute(type, coverImageUrl, siteOrigin) {
  const normalizedType = normalizeEventType(type);
  const custom = coverImageUrl?.trim();
  const path =
    custom && !isBundledDefaultCover(custom)
      ? custom
      : DEFAULT_COVER_BY_TYPE[normalizedType] ?? DEFAULT_COVER_BY_TYPE.road;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = siteOrigin.replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function formatEventOgDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  })} UTC`;
}

function lifecycleSuffix(status) {
  if (status === 'cancelled') return ' · Cancelled';
  if (status === 'completed' || status === 'archived') return ' · Completed';
  return '';
}

export function buildEventPageMeta(event, {siteOrigin, pageUrl, isResults = false} = {}) {
  const origin = (siteOrigin ?? 'https://forza.events').replace(/\/$/, '');
  const url = pageUrl ?? `${origin}/event/${event.id}${isResults ? '/results' : ''}`;
  const typeLabel = EVENT_TYPE_LABEL_EN[normalizeEventType(event.type)] ?? 'Road racing';
  const when = formatEventOgDate(event.starts_at ?? event.startsAt);
  const players = Math.max(0, Number(event.current_players ?? event.currentPlayers ?? 0));
  const maxPlayers = Math.max(
    1,
    Number(event.max_players ?? event.maxPlayers ?? LOBBY_TOTAL_PLAYERS),
  );
  const groupCount = Math.max(1, Number(event.group_count ?? event.groupCount ?? 1));
  const cap = maxPlayers * groupCount;
  const status = event.status ?? event.lifecycle ?? 'open';
  const suffix = lifecycleSuffix(status);

  const titleBase = String(event.title ?? 'Event').trim() || 'Event';
  const pageTitle = isResults
    ? `${titleBase} · Results · ${SITE_NAME}`
    : `${titleBase} · ${SITE_NAME}`;

  const parts = [typeLabel];
  if (when) parts.push(when);
  parts.push(`${players}/${cap} participants`);
  const description = `${parts.join(' · ')}${suffix}`;

  const image = resolveEventCoverAbsolute(
    event.type,
    event.cover_image_url ?? event.coverImageUrl,
    origin,
  );

  return {title: pageTitle, description, image, url, siteName: SITE_NAME};
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function buildEventOgHtml(meta) {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const image = escapeHtml(meta.image);
  const url = escapeHtml(meta.url);
  const siteName = escapeHtml(meta.siteName ?? SITE_NAME);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${url}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${image}">
  <meta property="og:url" content="${url}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${siteName}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${image}">
</head>
<body>
  <p><a href="${url}">${title}</a></p>
</body>
</html>`;
}
