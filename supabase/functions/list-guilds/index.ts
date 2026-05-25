import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {verifyDiscordToken} from '../_shared/discord.ts';

type DiscordGuild = {
  id: string;
  name: string;
  icon: string | null;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') return jsonResponse({error: 'Method not allowed'}, 405);

  const token =
    req.headers.get('x-discord-access-token') ??
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const user = await verifyDiscordToken(token);
  if (!user) return jsonResponse({error: 'Unauthorized'}, 401});

  try {
    const res = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: {Authorization: `Bearer ${token}`},
    });

    if (!res.ok) {
      return jsonResponse({error: 'Failed to list guilds'}, 502);
    }

    const guilds = (await res.json()) as DiscordGuild[];
    const list = guilds
      .map((g) => ({
        id: g.id,
        name: g.name,
        icon_url: g.icon
          ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png`
          : null,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return jsonResponse({guilds: list});
  } catch (e) {
    console.error(e);
    return jsonResponse({error: String(e)}, 500);
  }
});
