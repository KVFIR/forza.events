import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {normalizeClientEvent} from '../_shared/clientAnalytics.ts';
import {trackSecretOk} from '../_shared/analyticsTrack.ts';
import {databaseErrorResponse, internalErrorResponse} from '../_shared/apiResponse.ts';
import {CLIENT_SURFACE_HEADER, parseClientSurface} from '../_shared/clientSurface.ts';
import {clientIp, jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {verifyDiscordToken} from '../_shared/discord.ts';
import {rateLimitOr429} from '../_shared/rateLimit.ts';
import {adminClient} from '../_shared/supabase.ts';

const MAX_BATCH = 20;

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req);
  if (req.method !== 'POST') {
    return jsonResponse({error: 'Method not allowed'}, 405, req);
  }

  const limited = await rateLimitOr429(req, `analytics:${clientIp(req)}`, 120, 60);
  if (limited) return limited;

  if (!trackSecretOk(req)) {
    return jsonResponse({error: 'Forbidden'}, 403, req);
  }

  try {
    const body = await req.json().catch(() => null);
    const events = body?.events;
    if (!Array.isArray(events) || events.length === 0 || events.length > MAX_BATCH) {
      return jsonResponse({error: 'Bad request'}, 400, req);
    }

    const discordToken = req.headers.get('x-discord-access-token');
    const discordUser = discordToken ? await verifyDiscordToken(discordToken) : null;
    const surface = parseClientSurface(req.headers.get(CLIENT_SURFACE_HEADER));

    const rows = events
      .map((event) => normalizeClientEvent(event, surface, discordUser?.id ?? null))
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (rows.length === 0) {
      return jsonResponse({error: 'Bad request'}, 400, req);
    }

    const supabase = adminClient();
    const {error} = await supabase.from('client_events').insert(rows);
    if (error) {
      return databaseErrorResponse(req, 'client_events insert failed', error);
    }

    return jsonResponse({ok: true, count: rows.length}, 200, req);
  } catch (e) {
    return internalErrorResponse(req, e);
  }
});
