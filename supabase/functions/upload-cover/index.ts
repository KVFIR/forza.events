import {decodeBase64} from 'https://deno.land/std@0.224.0/encoding/base64.ts';
import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {internalErrorResponse} from '../_shared/apiResponse.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {COVER_SOURCE_MAX_BYTES, coverSourceLimitErrorEn} from '../_shared/coverImage.ts';
import {verifyDiscordToken} from '../_shared/discord.ts';
import {rateLimitMutation} from '../_shared/rateLimitPresets.ts';
import {adminClient} from '../_shared/supabase.ts';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req);
  if (req.method !== 'POST') return jsonResponse({error: 'Method not allowed'}, 405, req);

  const token =
    req.headers.get('x-discord-access-token') ??
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const discordUser = await verifyDiscordToken(token);
  if (!discordUser) return jsonResponse({error: 'Unauthorized'}, 401, req);

  const uploadLimited = await rateLimitMutation(req, discordUser.id);
  if (uploadLimited) return uploadLimited;

  try {
    const body = await req.json();
    const eventId = body.event_id as string;
    const guildId = body.guild_id as string;
    const contentBase64 = body.content_base64 as string;
    const contentType = String(body.content_type ?? '');
    const filename = String(body.filename ?? 'cover.webp');

    if (!eventId || !UUID_RE.test(eventId)) {
      return jsonResponse({error: 'Invalid event_id'}, 400, req);
    }
    if (!guildId) return jsonResponse({error: 'Missing guild_id'}, 400, req);
    if (!contentBase64) return jsonResponse({error: 'Missing content_base64'}, 400, req);
    if (!ALLOWED_TYPES.has(contentType)) {
      return jsonResponse({error: 'Unsupported image type'}, 400, req);
    }

    const bytes = decodeBase64(contentBase64);
    if (bytes.byteLength > COVER_SOURCE_MAX_BYTES) {
      return jsonResponse({error: coverSourceLimitErrorEn()}, 400, req);
    }

    const supabase = adminClient();
    const {data: event} = await supabase
      .from('events')
      .select('host_discord_id, guild_id')
      .eq('id', eventId)
      .single();

    if (!event || event.host_discord_id !== discordUser.id) {
      return jsonResponse({error: 'Forbidden'}, 403, req);
    }
    if (event.guild_id !== guildId) {
      return jsonResponse({error: 'Guild does not match event'}, 400, req);
    }

    const ext = (filename.split('.').pop() ?? 'webp').toLowerCase();
    const safeExt = ['webp', 'jpg', 'jpeg', 'png'].includes(ext) ? ext : 'webp';
    const path = `${guildId}/${eventId}/cover.${safeExt}`;

    const {error: uploadError} = await supabase.storage.from('event-covers').upload(path, bytes, {
      upsert: true,
      contentType,
    });
    if (uploadError) {
      console.error('upload-cover', uploadError);
      return jsonResponse({error: uploadError.message}, 500, req);
    }

    const {data: urlData} = supabase.storage.from('event-covers').getPublicUrl(path);
    return jsonResponse({url: urlData.publicUrl}, 200, req);
  } catch (e) {
    return internalErrorResponse(req, e);
  }
});
