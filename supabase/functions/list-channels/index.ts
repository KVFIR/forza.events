import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {botHeaders, verifyDiscordToken} from '../_shared/discord.ts';

type DiscordChannel = {
  id: string;
  name: string;
  type: number;
  position: number;
  parent_id?: string;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') return jsonResponse({error: 'Method not allowed'}, 405);

  const token =
    req.headers.get('x-discord-access-token') ??
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const user = await verifyDiscordToken(token);
  if (!user) return jsonResponse({error: 'Unauthorized'}, 401);

  try {
    const {guild_id} = await req.json();
    if (!guild_id) return jsonResponse({error: 'Missing guild_id'}, 400);

    const res = await fetch(
      `https://discord.com/api/guilds/${guild_id}/channels`,
      {headers: botHeaders()},
    );
    if (!res.ok) {
      return jsonResponse({error: 'Failed to list channels'}, 502);
    }

    const channels = (await res.json()) as DiscordChannel[];
    const text = channels
      .filter((c) => c.type === 0)
      .sort((a, b) => a.position - b.position)
      .map((c) => ({id: c.id, name: c.name, position: c.position}));

    return jsonResponse({channels: text});
  } catch (e) {
    console.error(e);
    return jsonResponse({error: String(e)}, 500);
  }
});
