import {handleEventRoute} from './eventOgHandler.js';
import {handleRobotsRoute} from './robotsHandler.js';
import {handleSitemapRoute} from './sitemapHandler.js';
import {handleStaticRoute} from './staticOgHandler.js';
import {proxySupabase} from './supabaseProxy.js';
import {normalizeSitePath} from '../shared/sitePageMeta.mjs';

export default {
  async fetch(request, env) {
    const {pathname} = new URL(request.url);
    const path = normalizeSitePath(pathname);

    if (pathname.startsWith('/supabase')) {
      return proxySupabase(request, env);
    }

    if (path === '/robots.txt') {
      return handleRobotsRoute(request, env);
    }

    if (path === '/sitemap.xml') {
      return handleSitemapRoute(request, env);
    }

    if (pathname.startsWith('/event/')) {
      return handleEventRoute(request, env);
    }

    return handleStaticRoute(request, env);
  },
};
