import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {verifyDiscordToken} from '../_shared/discord.ts';
import {resolveCoverUrl} from '../_shared/eventCovers.ts';
import {slugify} from '../_shared/events.ts';
import {adminClient} from '../_shared/supabase.ts';

const PLAYER_SLOTS = 11;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CarPayload = {
  id: string;
  make: string;
  model: string;
  year: number | null;
  pi: number;
  class: string;
  max_pi: number;
  tune_share_code?: string | null;
  car_restrictions?: string[];
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
    const supabase = adminClient();

    const guildId = body.guild_id as string;
    if (!guildId) return jsonResponse({error: 'Missing guild_id'}, 400);

    const cars: CarPayload[] = body.cars ?? [];
    if (cars.length === 0) {
      return jsonResponse({error: 'Add at least one car to the event'}, 400);
    }

    await supabase.from('discord_guilds').upsert(
      {guild_id: guildId, guild_name: body.guild_name ?? 'Server'},
      {onConflict: 'guild_id'},
    );

    const row = {
      title: body.title,
      type: body.type,
      status: body.publish ? 'open' : 'draft',
      host_discord_id: discordUser.id,
      guild_id: guildId,
      starts_at: body.starts_at,
      timezone_hint: body.timezone_hint,
      max_pi: Math.max(...cars.map((c) => c.max_pi ?? 999)),
      car_setup_mode: 'general',
      tuning_restrictions: [],
      voice_policy: body.voice_policy ?? 'optional',
      max_players: PLAYER_SLOTS,
      cover_image_url: resolveCoverUrl(body.type, body.cover_image_url),
      description: body.description,
      track_codes: (body.track_list ?? []).map((c: string) => c.trim()).filter(Boolean),
      event_share_code: null,
      rules_allowed: [],
      rules_forbidden: [],
      lobby_leader_gamertag: body.lobby_leader_gamertag ?? 'TBD',
      lobby_leader_is_host: body.lobby_leader_is_host ?? true,
    };

    let eventId = body.id as string | undefined;

    if (eventId) {
      const {data: existing} = await supabase
        .from('events')
        .select('host_discord_id')
        .eq('id', eventId)
        .single();
      if (!existing || existing.host_discord_id !== discordUser.id) {
        return jsonResponse({error: 'Forbidden'}, 403);
      }
      const {data, error} = await supabase
        .from('events')
        .update(row)
        .eq('id', eventId)
        .select('id, slug')
        .single();
      if (error) return jsonResponse({error: error.message}, 500);
      eventId = data.id;
      await syncEventCars(supabase, eventId, cars);
      return jsonResponse({id: eventId, slug: data.slug});
    }

    let slug = slugify(body.title);
    for (let i = 0; i < 5; i++) {
      const trySlug = i === 0 ? slug : `${slug}-${i + 1}`;
      const {data, error} = await supabase
        .from('events')
        .insert({...row, slug: trySlug})
        .select('id, slug')
        .single();
      if (!error && data) {
        await syncEventCars(supabase, data.id, cars);
        return jsonResponse({id: data.id, slug: data.slug});
      }
      if (error?.code !== '23505') {
        return jsonResponse({error: error?.message ?? 'Insert failed'}, 500);
      }
      slug = trySlug;
    }

    return jsonResponse({error: 'Could not create unique slug'}, 500);
  } catch (e) {
    console.error(e);
    return jsonResponse({error: String(e)}, 500);
  }
});

async function resolveCarId(
  supabase: ReturnType<typeof adminClient>,
  c: CarPayload,
): Promise<string | null> {
  if (UUID_RE.test(c.id)) {
    const {data} = await supabase.from('cars').select('id').eq('id', c.id).maybeSingle();
    return data?.id ?? null;
  }

  let q = supabase.from('cars').select('id').eq('make', c.make).eq('model', c.model);
  if (c.year != null) q = q.eq('year', c.year);
  const {data: existing} = await q.maybeSingle();
  if (existing) return existing.id;

  const {data: inserted, error} = await supabase
    .from('cars')
    .insert({
      make: c.make,
      model: c.model,
      year: c.year,
      pi: c.pi,
      class: c.class,
    })
    .select('id')
    .single();

  if (error) {
    console.error('car insert', error);
    return null;
  }
  return inserted.id;
}

async function syncEventCars(
  supabase: ReturnType<typeof adminClient>,
  eventId: string,
  cars: CarPayload[],
) {
  await supabase.from('event_cars').delete().eq('event_id', eventId);

  const rows = [];
  for (const c of cars) {
    const carId = await resolveCarId(supabase, c);
    if (!carId) continue;
    rows.push({
      event_id: eventId,
      car_id: carId,
      max_pi: c.max_pi ?? 999,
      tune_share_code: c.tune_share_code?.trim() || null,
      car_restrictions: c.car_restrictions ?? [],
    });
  }

  if (rows.length) {
    await supabase.from('event_cars').insert(rows);
  }
}
