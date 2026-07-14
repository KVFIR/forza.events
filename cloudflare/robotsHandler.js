import {buildRobotsTxt} from '../shared/sitemap.mjs';
import {siteOrigin, textResponseHeaders} from './railwayProxy.js';

export function handleRobotsRoute(_request, env) {
  const body = buildRobotsTxt(siteOrigin(env));
  return new Response(body, {
    status: 200,
    headers: textResponseHeaders(86400),
  });
}
