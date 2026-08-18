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

export const EVENT_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const EVENT_PATH_RE = /^\/event\/([^/]+)(?:\/results)?\/?$/i;

const CRAWLER_UA_RE =
  /bot|facebookexternalhit|discordbot|slackbot|telegrambot|twitterbot|linkedinbot|whatsapp|embedly|pinterest|applebot|bingbot|bingpreview|skypeuripreview|vkshare|redditbot|google-inspectiontool|google-extended|gptbot|chatgpt-user|anthropic-ai|claude-web|claudebot|perplexitybot|bytespider|meta-externalagent|cohere-ai/i;

export function parseEventPagePath(pathname) {
  const m = pathname.match(EVENT_PATH_RE);
  if (!m) return null;
  let eventId;
  try {
    eventId = decodeURIComponent(m[1]);
  } catch {
    eventId = m[1];
  }
  if (!eventId) return null;
  return {eventId, isResults: /\/results\/?$/i.test(pathname), isUuid: EVENT_UUID_RE.test(eventId)};
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
  const key = event.slug?.trim() || event.id;
  const url =
    pageUrl ?? `${origin}/event/${encodeURIComponent(key)}${isResults ? '/results' : ''}`;
  const typeLabel = EVENT_TYPE_LABEL_EN[normalizeEventType(event.type)] ?? 'Road racing';
  const when = formatEventOgDate(event.starts_at ?? event.startsAt);
  const status = event.status ?? event.lifecycle ?? 'open';
  const suffix = lifecycleSuffix(status);

  const titleBase = String(event.title ?? 'Event').trim() || 'Event';
  const pageTitle = isResults ? `${titleBase} · Results` : titleBase;

  const parts = [typeLabel];
  if (when) parts.push(when);
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

function schemaEventStatus(status) {
  if (status === 'cancelled') return 'https://schema.org/EventCancelled';
  if (status === 'completed' || status === 'archived') return null;
  return 'https://schema.org/EventScheduled';
}

export function buildEventJsonLd(event, meta, {siteOrigin} = {}) {
  const origin = (siteOrigin ?? 'https://forza.events').replace(/\/$/, '');
  const status = event.status ?? event.lifecycle ?? 'open';
  const startDate = event.starts_at ?? event.startsAt;
  const name = String(meta.title ?? 'Event')
    .replace(/ · Results$/i, '')
    .trim();
  const eventStatus = schemaEventStatus(status);

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name,
    description: meta.description,
    startDate,
    ...(eventStatus ? {eventStatus} : {}),
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    image: meta.image,
    url: meta.url,
    organizer: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: origin,
    },
  };
}

export function buildEventCrawlerBody(meta) {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const url = escapeHtml(meta.url);
  const siteName = escapeHtml(meta.siteName ?? SITE_NAME);

  return `<main>
  <h1>${title}</h1>
  <p>${description}</p>
  <p>Forza Horizon community event on ${siteName}. Sign in with Discord to browse and join.</p>
  <p><a href="${url}">View event on ${siteName}</a></p>
</main>`;
}

export function buildCrawlerPageHtml(meta, {bodyHtml, jsonLd, robots = 'index, follow'} = {}) {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const image = escapeHtml(meta.image);
  const url = escapeHtml(meta.url);
  const siteName = escapeHtml(meta.siteName ?? SITE_NAME);
  const body = bodyHtml ?? `<p><a href="${url}">${title}</a></p>`;
  const robotsContent = escapeHtml(robots);
  const jsonLdScript = jsonLd
    ? `\n  <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta name="robots" content="${robotsContent}">
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
  <meta name="twitter:image" content="${image}">${jsonLdScript}
</head>
<body>
  ${body}
</body>
</html>`;
}

/** @deprecated Use buildCrawlerPageHtml — kept for existing imports. */
export function buildEventOgHtml(meta, options) {
  return buildCrawlerPageHtml(meta, options);
}
