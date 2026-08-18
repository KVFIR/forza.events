import {
  buildCrawlerPageHtml,
  buildEventCrawlerBody,
  buildEventJsonLd,
  buildEventPageMeta,
  eventCrawlerRobots,
  eventPublicUrl,
  isLinkPreviewCrawler,
  parseEventPagePath,
  SITE_NAME,
} from '../shared/eventPageMeta.mjs';
import {ogResponseHeaders, proxyToRailway, siteOrigin} from './railwayProxy.js';
import {resolveDefaultOgImage, buildStaticCrawlerBody} from '../shared/sitePageMeta.mjs';

const DEFAULT_SUPABASE_ORIGIN = 'https://uoysqfczahqmctbrrizn.supabase.co';

/** Unquoted `eq.value` — `eq."slug"` via URLSearchParams becomes `eq.%22slug%22` and 404s. */
export function postgrestEq(value) {
  return `eq.${String(value)}`;
}

async function fetchPublishedEvent(eventKey, isUuid, env) {
  const anonKey = env.SUPABASE_ANON_KEY?.trim();
  if (!anonKey) return {kind: 'error', reason: 'missing_key'};

  const origin = (env.SUPABASE_ORIGIN || DEFAULT_SUPABASE_ORIGIN).replace(/\/$/, '');
  const params = new URLSearchParams({
    [isUuid ? 'id' : 'slug']: postgrestEq(eventKey),
    status: 'neq.draft',
    discord_message_id: 'not.is.null',
    select: 'id,slug,title,type,cover_image_url,starts_at,current_players,max_players,status,description',
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
  return new Response(
    buildCrawlerPageHtml(meta, {bodyHtml: buildStaticCrawlerBody(meta), robots: 'noindex, follow'}),
    {
      status: 404,
      headers: ogResponseHeaders(60),
    },
  );
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
  return new Response(
    buildCrawlerPageHtml(meta, {bodyHtml: buildStaticCrawlerBody(meta), robots: 'noindex, follow'}),
    {
      status: 503,
      headers: ogResponseHeaders(30),
    },
  );
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
  const outcome = await fetchPublishedEvent(parsed.eventId, parsed.isUuid, env);
  if (outcome.kind === 'error') {
    return errorHtml(pageUrl, env);
  }
  if (outcome.kind === 'not_found') {
    return notFoundHtml(pageUrl, env);
  }

  const slug = typeof outcome.event.slug === 'string' ? outcome.event.slug.trim() : '';
  const origin = siteOrigin(env);
  const canonicalUrl = eventPublicUrl(origin, {slug, id: parsed.eventId}, {
    results: parsed.isResults,
  });
  const meta = buildEventPageMeta(outcome.event, {
    siteOrigin: origin,
    pageUrl: canonicalUrl,
    isResults: parsed.isResults,
  });
  const about = String(outcome.event.description ?? '').trim().slice(0, 2000);

  return new Response(
    buildCrawlerPageHtml(meta, {
      bodyHtml: buildEventCrawlerBody(meta, {about}),
      jsonLd: buildEventJsonLd(outcome.event, meta, {siteOrigin: origin}),
      robots: eventCrawlerRobots(outcome.event.status, parsed.isResults),
    }),
    {
      status: 200,
      headers: ogResponseHeaders(300),
    },
  );
}
