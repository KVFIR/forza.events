import {
  buildEventOgHtml,
  buildEventPageMeta,
  isLinkPreviewCrawler,
  parseEventPagePath,
  SITE_NAME,
} from '../shared/eventPageMeta.mjs';
import {ogResponseHeaders, proxyToRailway, siteOrigin} from './railwayProxy.js';
import {resolveDefaultOgImage} from '../shared/sitePageMeta.mjs';

const DEFAULT_SUPABASE_ORIGIN = 'https://uoysqfczahqmctbrrizn.supabase.co';

async function fetchPublishedEvent(eventId, env) {
  const anonKey = env.SUPABASE_ANON_KEY?.trim();
  if (!anonKey) return {kind: 'error', reason: 'missing_key'};

  const origin = (env.SUPABASE_ORIGIN || DEFAULT_SUPABASE_ORIGIN).replace(/\/$/, '');
  const params = new URLSearchParams({
    id: `eq.${eventId}`,
    status: 'neq.draft',
    select: 'id,title,type,cover_image_url,starts_at,current_players,max_players,status',
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
    if (!rows[0]) return {kind: 'not_found'};
    return {kind: 'ok', event: rows[0]};
  } catch {
    return {kind: 'error', reason: 'network'};
  }
}

function notFoundHtml(pageUrl, env) {
  const origin = siteOrigin(env);
  const meta = {
    title: `Event not found · ${SITE_NAME}`,
    description: 'This event may have been removed or is not public.',
    image: resolveDefaultOgImage(origin),
    url: pageUrl,
    siteName: SITE_NAME,
  };
  return new Response(buildEventOgHtml(meta), {
    status: 404,
    headers: ogResponseHeaders(60),
  });
}

function errorHtml(pageUrl, env) {
  const origin = siteOrigin(env);
  const meta = {
    title: SITE_NAME,
    description: 'Event preview is temporarily unavailable. Open the link in your browser.',
    image: resolveDefaultOgImage(origin),
    url: pageUrl,
    siteName: SITE_NAME,
  };
  return new Response(buildEventOgHtml(meta), {
    status: 503,
    headers: ogResponseHeaders(30),
  });
}

export async function handleEventRoute(request, env) {
  const url = new URL(request.url);
  const parsed = parseEventPagePath(url.pathname);
  if (!parsed) {
    if (isLinkPreviewCrawler(request.headers.get('user-agent'))) {
      return notFoundHtml(`${siteOrigin(env)}${url.pathname}`, env);
    }
    return proxyToRailway(request, env);
  }

  if (!isLinkPreviewCrawler(request.headers.get('user-agent'))) {
    return proxyToRailway(request, env);
  }

  const pageUrl = `${siteOrigin(env)}${url.pathname}`;
  const outcome = await fetchPublishedEvent(parsed.eventId, env);
  if (outcome.kind === 'error') {
    return errorHtml(pageUrl, env);
  }
  if (outcome.kind === 'not_found') {
    return notFoundHtml(pageUrl, env);
  }

  const meta = buildEventPageMeta(outcome.event, {
    siteOrigin: siteOrigin(env),
    pageUrl,
    isResults: parsed.isResults,
  });

  return new Response(buildEventOgHtml(meta), {
    status: 200,
    headers: ogResponseHeaders(300),
  });
}
