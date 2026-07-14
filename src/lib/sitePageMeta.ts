import {
  DEFAULT_SITE_ORIGIN,
  type PageMeta,
  resolveDefaultOgImage,
  SITE_NAME,
} from './pageMeta';

/** Keep in sync with `shared/sitePageMeta.mjs`. */
export const DEFAULT_SITE_DESCRIPTION =
  'Community events for Forza Horizon, delivered as a Discord Activity.';

const STATIC_PAGES: Record<string, {title: string; description: string}> = {
  '/': {
    title: 'Browse events',
    description: 'Browse upcoming Forza Horizon races, dirt events, and cruises.',
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

export const EVENT_PAGE_PATH_RE =
  /^\/event\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:\/results)?\/?$/i;

export function normalizeSitePath(pathname: string): string {
  const pathOnly = pathname.split('?')[0].split('#')[0];
  return pathOnly.replace(/\/+$/, '') || '/';
}

export function isEventPagePath(pathname: string): boolean {
  return EVENT_PAGE_PATH_RE.test(normalizeSitePath(pathname));
}

export function buildDefaultSitePageMeta(options?: {
  siteOrigin?: string;
  pageUrl?: string;
}): PageMeta {
  const origin = (options?.siteOrigin ?? DEFAULT_SITE_ORIGIN).replace(/\/$/, '');
  const url = options?.pageUrl ?? origin;
  return {
    title: SITE_NAME,
    description: DEFAULT_SITE_DESCRIPTION,
    image: resolveDefaultOgImage(origin),
    url,
    siteName: SITE_NAME,
  };
}

export function buildStaticPageMeta(
  pathname: string,
  options?: {siteOrigin?: string; pageUrl?: string},
): PageMeta {
  const origin = (options?.siteOrigin ?? DEFAULT_SITE_ORIGIN).replace(/\/$/, '');
  const path = normalizeSitePath(pathname);
  const page = STATIC_PAGES[path];
  const url = options?.pageUrl ?? `${origin}${path === '/' ? '' : path}`;

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
