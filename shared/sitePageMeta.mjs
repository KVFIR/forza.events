/** Static site page meta — keep in sync with `src/lib/sitePageMeta.ts`. */

import {SITE_NAME, escapeHtml, eventPublicUrl, isLinkPreviewCrawler} from './eventPageMeta.mjs';

export {SITE_NAME, isLinkPreviewCrawler};

export const DEFAULT_SITE_ORIGIN = 'https://forza.events';
export const DEFAULT_OG_IMAGE_PATH = '/og/site.webp';

export const DEFAULT_OG_IMAGE_WIDTH = 1200;
export const DEFAULT_OG_IMAGE_HEIGHT = 630;

export const DEFAULT_SITE_DESCRIPTION =
  'Community events for Forza Horizon, delivered as a Discord Activity.';

const STATIC_PAGES = {
  '/': {
    title: 'Browse events',
    description: 'Browse upcoming Forza Horizon races, dirt events, and cruises.',
  },
  '/leaderboard': {
    title: 'Ladder',
    description: 'Driver ladder by rating for ranked Forza Horizon races.',
  },
  '/my-events': {
    title: 'My Events',
    description: 'Events you host or join on FORZA.EVENTS.',
  },
  '/create': {
    title: 'Create event',
    description: 'Create and publish Forza Horizon community events to Discord.',
  },
  '/profile': {
    title: 'Profile',
    description: 'Your FORZA.EVENTS profile, gamertag, and racing stats.',
  },
  '/terms': {
    title: 'Terms of Service',
    description: 'Terms of Service for FORZA.EVENTS.',
  },
  '/privacy': {
    title: 'Privacy Policy',
    description: 'Privacy Policy for FORZA.EVENTS.',
  },
  '/sign-in': {
    title: 'Sign in',
    description: 'Sign in with Discord to browse, join, and host Forza Horizon events.',
  },
  '/bot-installed': {
    title: 'Bot installed',
    description: 'The FORZA.EVENTS bot was added to your Discord server.',
  },
};

export function normalizeSitePath(pathname) {
  const pathOnly = pathname.split('?')[0].split('#')[0];
  return pathOnly.replace(/\/+$/, '') || '/';
}

export function resolveDefaultOgImage(siteOrigin) {
  const base = siteOrigin.replace(/\/$/, '');
  return `${base}${DEFAULT_OG_IMAGE_PATH}`;
}

const STATIC_ASSET_EXT_RE = /\.(?:webp|png|jpe?g|gif|svg|ico|js|css|woff2?|map|json|txt|xml)$/i;

/** Public files crawlers fetch for embeds (og:image, favicon, Vite bundles). */
export function isStaticAssetPath(pathname) {
  const path = normalizeSitePath(pathname);
  if (STATIC_ASSET_EXT_RE.test(path)) return true;
  return (
    path.startsWith('/assets/') ||
    path.startsWith('/covers/') ||
    path.startsWith('/cars/') ||
    path.startsWith('/og/') ||
    path.startsWith('/logo/')
  );
}

export function buildDefaultSitePageMeta({siteOrigin, pageUrl} = {}) {
  const origin = (siteOrigin ?? DEFAULT_SITE_ORIGIN).replace(/\/$/, '');
  const url = pageUrl ?? `${origin}/`;
  return {
    title: SITE_NAME,
    description: DEFAULT_SITE_DESCRIPTION,
    image: resolveDefaultOgImage(origin),
    url,
    siteName: SITE_NAME,
  };
}

export function buildSiteJsonLd({siteOrigin, pageUrl} = {}) {
  const origin = (siteOrigin ?? DEFAULT_SITE_ORIGIN).replace(/\/$/, '');
  const url = pageUrl ?? `${origin}/`;
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url,
    description: DEFAULT_SITE_DESCRIPTION,
  };
}

export function buildStaticCrawlerBody(meta) {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const url = escapeHtml(meta.url);
  const siteName = escapeHtml(meta.siteName ?? SITE_NAME);

  return `<main>
  <h1>${title}</h1>
  <p>${description}</p>
  <p><a href="${url}">Open ${siteName}</a></p>
</main>`;
}

const HOME_CRAWLER_EVENT_LIMIT = 50;

export function buildHomeCrawlerBody(meta, events, {siteOrigin} = {}) {
  const origin = (siteOrigin ?? DEFAULT_SITE_ORIGIN).replace(/\/$/, '');
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const url = escapeHtml(meta.url);
  const siteName = escapeHtml(meta.siteName ?? SITE_NAME);
  const items = (events ?? [])
    .slice(0, HOME_CRAWLER_EVENT_LIMIT)
    .map((event) => {
      const href = escapeHtml(eventPublicUrl(origin, event));
      const eventTitle = escapeHtml(String(event.title ?? 'Event').trim() || 'Event');
      return `    <li><a href="${href}">${eventTitle}</a></li>`;
    })
    .join('\n');
  const list = items
    ? `\n  <nav aria-label="Events">\n    <ul>\n${items}\n    </ul>\n  </nav>`
    : '';

  return `<main>
  <h1>${title}</h1>
  <p>${description}</p>
  <p><a href="${escapeHtml(`${origin}/leaderboard`)}">Ladder</a> · <a href="${escapeHtml(`${origin}/terms`)}">Terms of Service</a> · <a href="${escapeHtml(`${origin}/privacy`)}">Privacy Policy</a></p>${list}
  <p><a href="${url}">Open ${siteName}</a></p>
</main>`;
}

export function buildStaticCrawlerExtras(pathname, meta, {siteOrigin} = {}) {
  const path = normalizeSitePath(pathname);
  const bodyHtml = buildStaticCrawlerBody(meta);
  const jsonLd = path === '/' ? buildSiteJsonLd({siteOrigin, pageUrl: meta.url}) : undefined;
  return {bodyHtml, jsonLd};
}

export function buildStaticPageMeta(pathname, {siteOrigin, pageUrl} = {}) {
  const origin = (siteOrigin ?? DEFAULT_SITE_ORIGIN).replace(/\/$/, '');
  const path = normalizeSitePath(pathname);
  const page = STATIC_PAGES[path];
  const url = pageUrl ?? (path === '/' ? `${origin}/` : `${origin}${path}`);

  if (!page) {
    return buildDefaultSitePageMeta({siteOrigin: origin, pageUrl: url});
  }

  return {
    title: `${page.title} · ${SITE_NAME}`,
    description: page.description,
    image: resolveDefaultOgImage(origin),
    url,
    siteName: SITE_NAME,
  };
}
