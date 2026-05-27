import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {API_ERROR_CODES} from '../_shared/apiErrorCodes.ts';
import {appErrorResponse, internalErrorResponse} from '../_shared/apiResponse.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {syncPublishedEmbedByEventId} from '../_shared/embedSync.ts';
import {verifyDiscordToken} from '../_shared/discord.ts';
import {eventHasStarted} from '../_shared/eventSpec.ts';
import {validateResultSubmitRow} from '../_shared/eventResults.ts';
import {allowedResultDiscordIds} from '../_shared/resultsRoster.ts';
import {rateLimitMutation} from '../_shared/rateLimitPresets.ts';
import {adminClient} from '../_shared/supabase.ts';

type ResultInput = {
  discord_id: string;
  position: number | null;
  dnf?: boolean;
  dns?: boolean;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req);
  if (req.method !== 'POST') return jsonResponse({error: 'Method not allowed'}, 405, req);

  const token =
    req.headers.get('x-discord-access-token') ??
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const discordUser = await verifyDiscordToken(token);
  if (!discordUser) return jsonResponse({error: 'Unauthorized'}, 401, req);

  const mutationLimited = await rateLimitMutation(req, discordUser.id);
  if (mutationLimited) return mutationLimited;

  try {
    const body = await req.json();
    const eventId = body.event_id as string;
    const results = (body.results ?? []) as ResultInput[];

    if (!eventId) return jsonResponse({error: 'Missing event_id'}, 400, req);
    if (!Array.isArray(results) || results.length === 0) {
      return jsonResponse({error: 'Add at least one result'}, 400, req);
    }

    const supabase = adminClient();
    const {data: event} = await supabase
      .from('events')
      .select('host_discord_id, starts_at, status')
      .eq('id', eventId)
      .single();

    if (!event) return jsonResponse({error: 'Event not found'}, 404, req);
    if (event.host_discord_id !== discordUser.id) {
      return jsonResponse({error: 'Forbidden'}, 403, req);
    }
    if (!eventHasStarted(event)) {
      return jsonResponse({error: 'Event has not started yet'}, 400, req);
    }
    if (['completed', 'cancelled', 'archived'].includes(event.status)) {
      return jsonResponse({error: 'Results are already final for this event'}, 409, req);
    }

    const {count: existingCount} = await supabase
      .from('event_results')
      .select('id', {count: 'exact', head: true})
      .eq('event_id', eventId);

    if ((existingCount ?? 0) > 0) {
      return jsonResponse({error: 'Results cannot be changed after submission'}, 409, req);
    }

    const {data: participants} = await supabase
      .from('event_participants')
      .select('discord_id, gamertag_snapshot')
      .eq('event_id', eventId);
    const allowedIds = allowedResultDiscordIds(participants ?? []);

    const finisherPositions = new Set<number>();

    for (const r of results) {
      if (!allowedIds.has(String(r.discord_id))) {
        return appErrorResponse(req, 400, API_ERROR_CODES.RESULTS_PARTICIPANTS_ONLY);
      }
      const rowErr = validateResultSubmitRow(r);
      if (rowErr) return jsonResponse({error: rowErr}, 400, req);
      if (r.position != null) {
        if (finisherPositions.has(r.position)) {
          return jsonResponse({error: 'Duplicate finishing position'}, 400, req);
        }
        finisherPositions.add(r.position);
      }
    }

    const rows = results.map((r) => ({
      event_id: eventId,
      discord_id: r.discord_id,
      position: r.position,
      dnf: r.dnf ?? false,
      dns: r.dns ?? false,
      points: null,
    }));

    const {error: insError} = await supabase.from('event_results').insert(rows);
    if (insError) return jsonResponse({error: insError.message}, 500, req);

    await supabase.from('events').update({status: 'completed'}).eq('id', eventId);

    const embedSync = await syncPublishedEmbedByEventId(supabase, eventId);
    if (!embedSync.ok) {
      console.error(
        JSON.stringify({
          msg: 'Results saved but Discord embed sync failed',
          eventId,
          status: embedSync.status,
        }),
      );
    }

    return jsonResponse({ok: true, embed_synced: embedSync.ok}, 200, req);
  } catch (e) {
    return internalErrorResponse(req, e);
  }
});
