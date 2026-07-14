import {buildCrawlerPageHtml} from '../shared/eventPageMeta.mjs';
import {
  buildStaticCrawlerExtras,
  buildStaticPageMeta,
  isLinkPreviewCrawler,
  isStaticAssetPath,
  normalizeSitePath,
} from '../shared/sitePageMeta.mjs';
import {isPrivateCrawlerPath} from '../shared/sitemap.mjs';
import {ogResponseHeaders, proxyToRailway, siteOrigin} from './railwayProxy.js';

export async function handleStaticRoute(request, env) {
  const url = new URL(request.url);
  const pathname = normalizeSitePath(url.pathname);

  if (isStaticAssetPath(pathname)) {
    return proxyToRailway(request, env);
  }

  if (!isLinkPreviewCrawler(request.headers.get('user-agent'))) {
    return proxyToRailway(request, env);
  }

  const origin = siteOrigin(env);
  const pageUrl = `${origin}${pathname === '/' ? '' : pathname}`;
  const meta = buildStaticPageMeta(pathname, {siteOrigin: origin, pageUrl});
  const {bodyHtml, jsonLd} = buildStaticCrawlerExtras(pathname, meta, {siteOrigin: origin});
  const robots = isPrivateCrawlerPath(pathname) ? 'noindex, follow' : 'index, follow';

  return new Response(buildCrawlerPageHtml(meta, {bodyHtml, jsonLd, robots}), {
    status: 200,
    headers: ogResponseHeaders(300),
  });
}
