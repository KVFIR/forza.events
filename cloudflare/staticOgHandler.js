import {buildEventOgHtml} from '../shared/eventPageMeta.mjs';
import {
  buildStaticPageMeta,
  isLinkPreviewCrawler,
  isStaticAssetPath,
  normalizeSitePath,
} from '../shared/sitePageMeta.mjs';
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

  return new Response(buildEventOgHtml(meta), {
    status: 200,
    headers: ogResponseHeaders(300),
  });
}
