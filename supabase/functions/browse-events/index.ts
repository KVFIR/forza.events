import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {EVENT_LIST_SELECT} from '../_shared/eventListSelect.ts';
import {internalErrorResponse} from '../_shared/apiResponse.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {verifyDiscordToken} from '../_shared/discord.ts';
import {rateLimitPublicRead} from '../_shared/rateLimitPresets.ts';
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

    const token =
      req.headers.get('x-discord-access-token') ??
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    const discordUser = token ? await verifyDiscordToken(token) : null;

    const supabase = adminClient();

    if (hostDrafts) {
      if (!discordUser) return jsonResponse({error: 'Unauthorized'}, 401, req);

      const {data, error} = await supabase
        .from('events')
        .select(EVENT_LIST_SELECT)
        .eq('host_discord_id', discordUser.id)
        .is('discord_message_id', null)
        .not('status', 'in', '("completed","cancelled","archived")')
        .order('updated_at', {ascending: false});

      if (error) {
        console.error('browse-events host_drafts', error);
        return jsonResponse({error: error.message}, 500, req);
      }

      return jsonResponse({data: data ?? []}, 200, req);
    }

    if (eventId) {
      const {data, error} = await supabase
        .from('events')
        .select(EVENT_LIST_SELECT)
        .eq('id', eventId)
        .maybeSingle();

      if (error) {
        console.error('browse-events', error);
        return jsonResponse({error: error.message}, 500, req);
      }

      if (!data) {
        return jsonResponse({data: []}, 200, req);
      }

      if (data.status === 'draft') {
        if (!discordUser || data.host_discord_id !== discordUser.id) {
          return jsonResponse({data: []}, 200, req);
        }
      }

      return jsonResponse({data: [data]}, 200, req);
    }

    let query = supabase
      .from('events')
      .select(EVENT_LIST_SELECT)
      .neq('status', 'draft')
      .order('starts_at', {ascending: true});

    if (!includeCompleted) {
      query = query.eq('status', 'open').gt('starts_at', new Date().toISOString());
    }

    const {data, error} = await query;

    if (error) {
      console.error('browse-events', error);
      return jsonResponse({error: error.message}, 500, req);
    }

    return jsonResponse({data: data ?? []}, 200, req);
  } catch (e) {
    return internalErrorResponse(req, e);
  }
});
