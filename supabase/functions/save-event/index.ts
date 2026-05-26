import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {syncPublishedEmbed} from '../_shared/embedSync.ts';
import {
  assertTargetNotLocked,
  buildEventFields,
  buildEventRow,
  canEditPublishedEvent,
  type CarPayload,
  type SaveEventBody,
  validateDraft,
  validatePublishReady,
  isPublishedStatus,
  eventHasStarted,
} from '../_shared/eventSpec.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {verifyDiscordToken} from '../_shared/discord.ts';
import {resolveCoverUrl} from '../_shared/eventCovers.ts';
import {slugify} from '../_shared/events.ts';
import {adminClient} from '../_shared/supabase.ts';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse();
  if (req.method !== 'POST') return jsonResponse({error: 'Method not allowed'}, 405);

  const token =
    req.headers.get('x-discord-access-token') ??
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const discordUser = await verifyDiscordToken(token);
  if (!discordUser) return jsonResponse({error: 'Unauthorized'}, 401);

  try {
    const body = (await req.json()) as SaveEventBody;
    const supabase = adminClient();

    if (body.delete && body.id) {
      const {data: existing} = await supabase
        .from('events')
        .select('host_discord_id, status, discord_message_id')
        .eq('id', body.id)
        .single();
      if (!existing || existing.host_discord_id !== discordUser.id) {
        return jsonResponse({error: 'Forbidden'}, 403);
      }
      const published = Boolean(existing.discord_message_id);
      const closed = ['completed', 'cancelled', 'archived'].includes(existing.status);
      if (published || closed) {
        return jsonResponse(
          {error: 'Only unpublished drafts can be deleted'},
          400,
        );
      }
      const {error} = await supabase.from('events').delete().eq('id', body.id);
      if (error) return jsonResponse({error: error.message}, 500);
      return jsonResponse({id: body.id, deleted: true});
    }

    if (body.cancel && body.id) {
      const {data: existing} = await supabase
        .from('events')
        .select('*')
        .eq('id', body.id)
        .single();
      if (!existing || existing.host_discord_id !== discordUser.id) {
        return jsonResponse({error: 'Forbidden'}, 403);
      }
      if (!eventHasStarted(existing)) {
        return jsonResponse({error: 'Event has not started yet'}, 400);
      }
      if (['completed', 'cancelled', 'archived'].includes(existing.status)) {
        return jsonResponse({error: 'Event is already closed'}, 400);
      }
      const {data: updated, error} = await supabase
        .from('events')
        .update({status: 'cancelled'})
        .eq('id', body.id)
        .select('*')
        .single();
      if (error) return jsonResponse({error: error.message}, 500);
      if (updated?.channel_id && updated.discord_message_id) {
        await syncPublishedEmbed(updated);
      }
      return jsonResponse({id: body.id, cancelled: true});
    }

    const draftErr = validateDraft(body);
    if (draftErr) return jsonResponse({error: draftErr}, 400);

    await supabase.from('discord_guilds').upsert(
      {guild_id: body.guild_id, guild_name: body.guild_name ?? 'Server'},
      {onConflict: 'guild_id'},
    );

    let existing: {
      id: string;
      host_discord_id: string;
      status: string;
      guild_id: string;
      channel_id: string | null;
      discord_message_id: string | null;
      starts_at: string;
      cover_image_url: string | null;
    } | null = null;

    if (body.id) {
      const {data} = await supabase
        .from('events')
        .select(
          'id, host_discord_id, status, guild_id, channel_id, discord_message_id, starts_at, cover_image_url',
        )
        .eq('id', body.id)
        .single();
      existing = data;
      if (!existing || existing.host_discord_id !== discordUser.id) {
        return jsonResponse({error: 'Forbidden'}, 403);
      }
      if (!canEditPublishedEvent(existing)) {
        return jsonResponse({error: 'Published events cannot be edited after start'}, 403);
      }
      const lockErr = await assertTargetNotLocked(supabase, existing, body);
      if (lockErr) return jsonResponse({error: lockErr}, 400);
    }

    if (body.publish) {
      const publishErr = validatePublishReady(body);
      if (publishErr) return jsonResponse({error: publishErr}, 400);
    }

    const cars: CarPayload[] =
      body.car_rule_mode === 'restricted_list' ? body.cars ?? [] : [];

    const coverUrl = resolveCoverUrl(body.type ?? 'road', body.cover_image_url);
    const fields = buildEventFields(body, discordUser.id, coverUrl);
    const insertRow = buildEventRow(body, discordUser.id, coverUrl);

    let eventId = body.id;

    if (eventId) {
      const {data, error} = await supabase
        .from('events')
        .update(fields)
        .eq('id', eventId)
        .select('*')
        .single();
      if (error) return jsonResponse({error: error.message}, 500);
      await syncEventCars(supabase, eventId, cars, body.car_rule_mode ?? 'anything_goes');
      if (isPublishedStatus(data.status)) {
        await syncPublishedEmbed(data);
      }
      return jsonResponse({id: eventId, slug: data.slug});
    }

    let slug = slugify(body.title ?? 'event');
    for (let i = 0; i < 5; i++) {
      const trySlug = i === 0 ? slug : `${slug}-${i + 1}`;
      const {data, error} = await supabase
        .from('events')
        .insert({...insertRow, slug: trySlug})
        .select('id, slug')
        .single();
      if (!error && data) {
        await syncEventCars(supabase, data.id, cars, body.car_rule_mode ?? 'anything_goes');
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
  mode: 'anything_goes' | 'restricted_list',
) {
  await supabase.from('event_cars').delete().eq('event_id', eventId);
  if (mode !== 'restricted_list' || cars.length === 0) return;

  type EventCarRow = {
    event_id: string;
    car_id: string;
    max_pi: number;
    tune_share_code: string | null;
    car_restrictions: string[];
  };

  const rows: EventCarRow[] = [];
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
