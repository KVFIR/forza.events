import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {appErrorResponse, internalErrorResponse} from '../_shared/apiResponse.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {requireDiscordUser} from '../_shared/discordRequestAuth.ts';
import {joinEventHttpStatus, joinEventParticipant, leaveEventParticipant} from '../_shared/eventJoin.ts';
import {validateGamertag} from '../_shared/gamertag.ts';
import {rateLimitMutation} from '../_shared/rateLimitPresets.ts';
import {adminClient} from '../_shared/supabase.ts';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req);
  if (req.method !== 'POST') return jsonResponse({error: 'Method not allowed'}, 405, req);

  const auth = await requireDiscordUser(req);
  if (auth instanceof Response) return auth;
  const {user: discordUser} = auth;

  const mutationLimited = await rateLimitMutation(req, discordUser.id);
  if (mutationLimited) return mutationLimited;

  try {
    const {event_id, action, gamertag} = await req.json();
    if (!event_id || typeof event_id !== 'string' || !UUID_RE.test(event_id)) {
      return jsonResponse({error: 'Invalid event_id'}, 400, req);
    }
    if (!action || typeof action !== 'string') {
      return jsonResponse({error: 'Missing action'}, 400, req);
    }

    const supabase = adminClient();

    if (action === 'leave') {
      const result = await leaveEventParticipant(supabase, {
        eventId: event_id,
        discordId: discordUser.id,
      });
      if (!result.ok) {
        return appErrorResponse(req, joinEventHttpStatus(result.code), result.code);
      }
      return jsonResponse({joined: false, embed_synced: result.embedSynced}, 200, req);
    }

    if (action === 'join') {
      const tag = validateGamertag(gamertag);
      if (!tag.ok) return jsonResponse({error: tag.error}, 400, req);

      const result = await joinEventParticipant(supabase, {
        eventId: event_id,
        discordUser,
        gamertag: tag.gamertag,
      });
      if (!result.ok) {
        return appErrorResponse(req, joinEventHttpStatus(result.code), result.code);
      }
      return jsonResponse(
        {
          joined: result.joined,
          waitlisted: result.waitlisted,
          group_index: result.group_index,
          embed_synced: result.embedSynced,
        },
        200,
        req,
      );
    }

    return jsonResponse({error: 'Unknown action'}, 400, req);
  } catch (e) {
    return internalErrorResponse(req, e);
  }
});
