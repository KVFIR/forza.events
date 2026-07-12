import {handleEventRoute} from './eventOgHandler.js';
import {proxySupabase} from './supabaseProxy.js';

export default {
  async fetch(request, env) {
    const {pathname} = new URL(request.url);

    if (pathname.startsWith('/supabase')) {
      return proxySupabase(request, env);
    }

    if (pathname.startsWith('/event/')) {
      return handleEventRoute(request, env);
    }

    return new Response('Not found', {status: 404});
  },
};
