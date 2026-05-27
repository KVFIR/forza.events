import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {internalErrorResponse} from '../_shared/apiResponse.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {verifyDiscordToken} from '../_shared/discord.ts';
import {searchGuildMembers} from '../_shared/guildMembers.ts';
import {userIsGuildMember} from '../_shared/guildAccess.ts';
import {rateLimitAuth} from '../_shared/rateLimitPresets.ts';
import {adminClient} from '../_shared/supabase.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req);
  if (req.method !== 'POST') return jsonResponse({error: 'Method not allowed'}, 405, req);

  const token =
    req.headers.get('x-discord-access-token') ??
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const user = await verifyDiscordToken(token);
  if (!user) return jsonResponse({error: 'Unauthorized'}, 401, req);

  const authLimited = await rateLimitAuth(req, user.id);
  if (authLimited) return authLimited;

  try {
    const {guild_id, query} = await req.json();
    if (!guild_id || typeof guild_id !== 'string') {
      return jsonResponse({error: 'Missing guild_id'}, 400, req);
    }
    if (typeof query !== 'string') {
      return jsonResponse({error: 'Missing query'}, 400, req);
    }

    const member = await userIsGuildMember(token!, guild_id);
    if (!member) return jsonResponse({error: 'Forbidden'}, 403, req);

    const hits = await searchGuildMembers(guild_id, query);
    const ids = hits.map((h) => h.discord_id);
    const gamertags = new Map<string, string>();

    if (ids.length > 0) {
      const supabase = adminClient();
      const {data: profiles} = await supabase
        .from('users')
        .select('discord_id, xbox_gamertag')
        .in('discord_id', ids);
      for (const row of profiles ?? []) {
        const tag = row.xbox_gamertag?.trim();
        if (tag) gamertags.set(row.discord_id, tag);
      }
    }

    const members = hits.map((h) => ({
      ...h,
      xbox_gamertag: gamertags.get(h.discord_id) ?? null,
    }));

    return jsonResponse({members}, 200, req);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('Guild member search')) {
      return jsonResponse({error: msg}, 503, req);
    }
    return internalErrorResponse(req, e);
  }
});
