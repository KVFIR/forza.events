import {buildSitemapXml} from '../shared/sitemap.mjs';
import {siteOrigin, textResponseHeaders, xmlResponseHeaders} from './railwayProxy.js';

const DEFAULT_SUPABASE_ORIGIN = 'https://uoysqfczahqmctbrrizn.supabase.co';
const SITEMAP_EVENT_LIMIT = 500;

async function fetchPublishedEventsForSitemap(env) {
  const anonKey = env.SUPABASE_ANON_KEY?.trim();
  if (!anonKey) return {kind: 'error', reason: 'missing_key'};

  const origin = (env.SUPABASE_ORIGIN || DEFAULT_SUPABASE_ORIGIN).replace(/\/$/, '');
  const params = new URLSearchParams({
    status: 'neq.draft',
    discord_message_id: 'not.is.null',
    select: 'id,slug,updated_at,starts_at',
    order: 'starts_at.desc',
    limit: String(SITEMAP_EVENT_LIMIT),
  });

  try {
    const res = await fetch(`${origin}/rest/v1/events?${params}`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) return {kind: 'error', reason: 'upstream', status: res.status};
    const rows = await res.json();
    return {kind: 'ok', events: Array.isArray(rows) ? rows : []};
  } catch {
    return {kind: 'error', reason: 'network'};
  }
}

export async function handleSitemapRoute(_request, env) {
  const origin = siteOrigin(env);
  const outcome = await fetchPublishedEventsForSitemap(env);
  if (outcome.kind !== 'ok') {
    return new Response('Sitemap temporarily unavailable', {
      status: 503,
      headers: textResponseHeaders(300),
    });
  }

  const xml = buildSitemapXml({siteOrigin: origin, events: outcome.events});

  return new Response(xml, {
    status: 200,
    headers: xmlResponseHeaders(3600),
  });
}
