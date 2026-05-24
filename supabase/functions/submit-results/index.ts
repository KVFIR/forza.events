import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {verifyDiscordToken} from '../_shared/discord.ts';
import {adminClient} from '../_shared/supabase.ts';

type ResultInput = {
  discord_id: string;
  position: number;
  dnf?: boolean;
  points?: number | null;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') return jsonResponse({error: 'Method not allowed'}, 405);

  const token =
    req.headers.get('x-discord-access-token') ??
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const discordUser = await verifyDiscordToken(token);
  if (!discordUser) return jsonResponse({error: 'Unauthorized'}, 401);

  try {
    const body = await req.json();
    const eventId = body.event_id as string;
    const results = (body.results ?? []) as ResultInput[];

    if (!eventId) return jsonResponse({error: 'Missing event_id'}, 400);
    if (!Array.isArray(results) || results.length === 0) {
      return jsonResponse({error: 'Add at least one result'}, 400);
    }

    const supabase = adminClient();
    const {data: event} = await supabase
      .from('events')
      .select('host_discord_id, starts_at, status')
      .eq('id', eventId)
      .single();

    if (!event) return jsonResponse({error: 'Event not found'}, 404);
    if (event.host_discord_id !== discordUser.id) {
      return jsonResponse({error: 'Forbidden'}, 403);
    }

    const started =
      event.status === 'live' ||
      event.status === 'checkin' ||
      event.status === 'completed' ||
      new Date(event.starts_at).getTime() <= Date.now();

    if (!started) return jsonResponse({error: 'Event has not started yet'}, 400);

    const rows = results.map((r) => ({
      event_id: eventId,
      discord_id: r.discord_id,
      position: r.position,
      dnf: r.dnf ?? false,
      points: r.points ?? null,
    }));

    const {error: delError} = await supabase.from('event_results').delete().eq('event_id', eventId);
    if (delError) return jsonResponse({error: delError.message}, 500);

    const {error: insError} = await supabase.from('event_results').insert(rows);
    if (insError) return jsonResponse({error: insError.message}, 500);

    await supabase.from('events').update({status: 'completed'}).eq('id', eventId);

    return jsonResponse({ok: true});
  } catch (e) {
    console.error(e);
    return jsonResponse({error: String(e)}, 500);
  }
});
