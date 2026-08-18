/** Sitemap + robots.txt — keep static paths aligned with `shared/sitePageMeta.mjs`. */

export const SITEMAP_STATIC_PATHS = ['/', '/leaderboard', '/terms', '/privacy'];

/** Paths blocked in robots.txt — also get `noindex` in crawler HTML. */
export const PRIVATE_CRAWLER_PATHS = ['/sign-in', '/my-events', '/create', '/profile'];
export const PRIVATE_CRAWLER_PREFIXES = ['/auth/'];

function normalizePath(pathname) {
  const pathOnly = pathname.split('?')[0].split('#')[0];
  return pathOnly.replace(/\/+$/, '') || '/';
}

export function isPrivateCrawlerPath(pathname) {
  const path = normalizePath(pathname);
  if (PRIVATE_CRAWLER_PATHS.includes(path)) return true;
  return PRIVATE_CRAWLER_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export function buildRobotsTxt(siteOrigin) {
  const origin = siteOrigin.replace(/\/$/, '');
  const disallow = [
    ...PRIVATE_CRAWLER_PREFIXES,
    ...PRIVATE_CRAWLER_PATHS,
  ]
    .map((path) => `Disallow: ${path}`)
    .join('\n');
  return `User-agent: *
Allow: /event/
Allow: /terms
Allow: /privacy
Allow: /
${disallow}

Sitemap: ${origin}/sitemap.xml
`;
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function formatSitemapLastmod(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function staticUrlEntry(origin, path) {
  const loc = path === '/' ? `${origin}/` : `${origin}${path}`;
  const priority = path === '/' ? '1.0' : '0.3';
  const changefreq = path === '/' ? 'daily' : 'monthly';
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

function eventUrlEntry(origin, event) {
  const key = typeof event.slug === 'string' && event.slug.trim() ? event.slug.trim() : event.id;
  const loc = `${origin}/event/${encodeURIComponent(key)}`;
  const lastmod = formatSitemapLastmod(event.updated_at ?? event.updatedAt ?? event.starts_at ?? event.startsAt);
  const lastmodTag = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : '';
  return `  <url>
    <loc>${escapeXml(loc)}</loc>${lastmodTag}
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
}

export function buildSitemapXml({siteOrigin, events = [], staticPaths = SITEMAP_STATIC_PATHS} = {}) {
  const origin = siteOrigin.replace(/\/$/, '');
  const staticEntries = staticPaths.map((path) => staticUrlEntry(origin, path));
  const eventEntries = events.map((event) => eventUrlEntry(origin, event));
  const urls = [...staticEntries, ...eventEntries].join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}
