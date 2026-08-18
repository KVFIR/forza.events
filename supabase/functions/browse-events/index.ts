import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {EVENT_DETAIL_SELECT, EVENT_LIST_SELECT} from '../_shared/eventListSelect.ts';
import {
  appErrorResponse,
  databaseErrorResponse,
  internalErrorResponse,
} from '../_shared/apiResponse.ts';
import {API_ERROR_CODES} from '../_shared/apiErrorCodes.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {optionalDiscordUser} from '../_shared/discordRequestAuth.ts';
import {rateLimitPublicRead} from '../_shared/rateLimitPresets.ts';
import {hostDraftStatusFilter} from '../_shared/draftEvents.ts';
import {isEventUuid} from '../_shared/eventPath.ts';
import {adminClient} from '../_shared/supabase.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req);
  if (req.method !== 'POST') {
    return jsonResponse({error: 'Method not allowed'}, 405, req);
  }

  const readLimited = await rateLimitPublicRead(req);
  if (readLimited) return readLimited;

  try {
    const body = await req.json().catch(() => ({}));
    const includeCompleted = Boolean(body.include_completed);
    const eventId = typeof body.event_id === 'string' ? body.event_id : null;
    const hostDrafts = Boolean(body.host_drafts);

    const discordUserOrErr = await optionalDiscordUser(req);
    if (discordUserOrErr instanceof Response) return discordUserOrErr;
    const discordUser = discordUserOrErr;

    const supabase = adminClient();

    if (hostDrafts) {
      if (!discordUser) {
        return appErrorResponse(req, 401, API_ERROR_CODES.UNAUTHORIZED);
      }

      const {data, error} = await supabase
        .from('events')
        .select(EVENT_LIST_SELECT)
        .eq('host_discord_id', discordUser.id)
        .in('status', hostDraftStatusFilter())
        .order('updated_at', {ascending: false});

      if (error) {
        console.error('browse-events host_drafts', error);
        return databaseErrorResponse(req, 'browse-events host_drafts', error);
      }

      return jsonResponse({data: data ?? []}, 200, req);
    }

    if (eventId) {
      const base = supabase.from('events').select(EVENT_DETAIL_SELECT);
      const {data, error} = await (isEventUuid(eventId)
        ? base.eq('id', eventId)
        : base.eq('slug', eventId)
      ).maybeSingle();

      if (error) {
        console.error('browse-events', error);
        return databaseErrorResponse(req, 'browse-events by id', error);
      }

      if (!data) {
        return jsonResponse({data: []}, 200, req);
      }

      const row = data as unknown as {status: string; host_discord_id: string};
      if (row.status === 'draft') {
        if (!discordUser || row.host_discord_id !== discordUser.id) {
          return jsonResponse({data: []}, 200, req);
        }
      }

      return jsonResponse({data: [data]}, 200, req);
    }

    if (Array.isArray(body.event_ids)) {
      const eventIds = body.event_ids
        .filter((id: unknown): id is string => typeof id === 'string' && isEventUuid(id))
        .slice(0, 60);
      if (eventIds.length === 0) {
        return jsonResponse({data: []}, 200, req);
      }
      const {data, error} = await supabase
        .from('events')
        .select('id, event_results(discord_id, position, dnf, dns), rating_ledger(discord_id, delta)')
        .in('id', eventIds)
        .neq('status', 'draft');
      if (error) {
        console.error('browse-events event_ids', error);
        return databaseErrorResponse(req, 'browse-events event_ids', error);
      }
      return jsonResponse({data: data ?? []}, 200, req);
    }

    let query = supabase
      .from('events')
      .select(EVENT_LIST_SELECT)
      .neq('status', 'draft')
      .order('starts_at', {ascending: true});

    if (!includeCompleted) {
      // Browse: active + completed showcase; My Events uses include_completed for cancelled/archived too.
      query = query.in('status', ['open', 'checkin', 'live', 'completed']);
    }

    const {data, error} = await query;

    if (error) {
      console.error('browse-events', error);
      return databaseErrorResponse(req, 'browse-events list', error);
    }

    return jsonResponse({data: data ?? []}, 200, req);
  } catch (e) {
    return internalErrorResponse(req, e);
  }
});
