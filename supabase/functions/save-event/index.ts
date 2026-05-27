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
import {appErrorResponse, internalErrorResponse} from '../_shared/apiResponse.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {verifyDiscordToken} from '../_shared/discord.ts';
import {ensureDiscordUserRow} from '../_shared/discordUserRow.ts';
import {resolveGuildNameForUser} from '../_shared/guildAccess.ts';
import {resolveCoverUrl} from '../_shared/eventCovers.ts';
import {slugify} from '../_shared/events.ts';
import {normalizeGuildName} from '../_shared/guildDisplay.ts';
import {resolveLobbyLeaderFields} from '../_shared/lobbyLeader.ts';
import {rateLimitMutation} from '../_shared/rateLimitPresets.ts';
import {adminClient} from '../_shared/supabase.ts';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req);
  if (req.method !== 'POST') return jsonResponse({error: 'Method not allowed'}, 405, req);

  const token =
    req.headers.get('x-discord-access-token') ??
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const discordUser = await verifyDiscordToken(token);
  if (!discordUser) return jsonResponse({error: 'Unauthorized'}, 401, req);

  const mutationLimited = await rateLimitMutation(req, discordUser.id);
  if (mutationLimited) return mutationLimited;

  try {
    const body = (await req.json()) as SaveEventBody;
    const supabase = adminClient();
    await ensureDiscordUserRow(supabase, discordUser);

    if (body.delete && body.id) {
      const {data: existing} = await supabase
        .from('events')
        .select('host_discord_id, status, discord_message_id')
        .eq('id', body.id)
        .single();
      if (!existing || existing.host_discord_id !== discordUser.id) {
        return jsonResponse({error: 'Forbidden'}, 403, req);
      }
      const published = Boolean(existing.discord_message_id);
      const closed = ['completed', 'cancelled', 'archived'].includes(existing.status);
      if (published || closed) {
        return jsonResponse(
          {error: 'Only unpublished drafts can be deleted'},
          400,
          req,
        );
      }
      const {error} = await supabase.from('events').delete().eq('id', body.id);
      if (error) return jsonResponse({error: error.message}, 500, req);
      return jsonResponse({id: body.id, deleted: true}, 200, req);
    }

    if (body.cancel && body.id) {
      const {data: existing} = await supabase
        .from('events')
        .select('*')
        .eq('id', body.id)
        .single();
      if (!existing || existing.host_discord_id !== discordUser.id) {
        return jsonResponse({error: 'Forbidden'}, 403, req);
      }
      if (!existing.discord_message_id) {
        return jsonResponse({error: 'Only published events can be cancelled'}, 400, req);
      }
      if (['completed', 'cancelled', 'archived'].includes(existing.status)) {
        return jsonResponse({error: 'Event is already closed'}, 400, req);
      }
      const {data: updated, error} = await supabase
        .from('events')
        .update({status: 'cancelled'})
        .eq('id', body.id)
        .select('*')
        .single();
      if (error) return jsonResponse({error: error.message}, 500, req);
      if (updated?.channel_id && updated.discord_message_id) {
        const embedSync = await syncPublishedEmbed(supabase, updated);
        if (!embedSync.ok) {
          console.error(
            JSON.stringify({
              msg: 'Cancel saved but Discord embed sync failed',
              eventId: body.id,
              status: embedSync.status,
            }),
          );
        }
      }
      return jsonResponse({id: body.id, cancelled: true}, 200, req);
    }

    const draftErr = validateDraft(body);
    if (draftErr) return appErrorResponse(req, 400, draftErr);

    if (body.guild_id) {
      const guildName = normalizeGuildName(
        (await resolveGuildNameForUser(token!, body.guild_id)) ?? body.guild_name,
      );
      if (guildName) {
        await supabase.from('discord_guilds').upsert(
          {guild_id: body.guild_id, guild_name: guildName},
          {onConflict: 'guild_id'},
        );
      } else {
        const {data: existingGuild} = await supabase
          .from('discord_guilds')
          .select('guild_id')
          .eq('guild_id', body.guild_id)
          .maybeSingle();
        if (!existingGuild) {
          return jsonResponse(
            {error: 'Choose a Discord server from the list so its name can be saved.'},
            400,
            req,
          );
        }
      }
    }

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
        return jsonResponse({error: 'Forbidden'}, 403, req);
      }
      if (!canEditPublishedEvent(existing)) {
        return jsonResponse({error: 'Published events cannot be edited after start'}, 403, req);
      }
      const lockErr = await assertTargetNotLocked(supabase, existing, body);
      if (lockErr) return appErrorResponse(req, 400, lockErr);
    }

    const lobbyResolved = await resolveLobbyLeaderFields(body, discordUser.id, supabase);
    if (typeof lobbyResolved === 'string') {
      return appErrorResponse(req, 400, lobbyResolved);
    }

    const publishBody = {
      ...body,
      lobby_leader_gamertag: lobbyResolved.lobby_leader_gamertag,
      channel_id: body.channel_id,
    };

    if (body.publish) {
      const publishErr = validatePublishReady(publishBody);
      if (publishErr) return appErrorResponse(req, 400, publishErr);
    }

    const cars: CarPayload[] =
      body.car_rule_mode === 'restricted_list' ? body.cars ?? [] : [];

    const coverUrl = resolveCoverUrl(body.type ?? 'road', body.cover_image_url);
    const fields = buildEventFields(body, discordUser.id, coverUrl, lobbyResolved);
    const insertRow = buildEventRow(body, discordUser.id, coverUrl, lobbyResolved);

    let eventId = body.id;

    if (eventId) {
      const {data, error} = await supabase
        .from('events')
        .update(fields)
        .eq('id', eventId)
        .select('*')
        .single();
      if (error) return jsonResponse({error: error.message}, 500, req);
      await syncEventCars(supabase, eventId, cars, body.car_rule_mode ?? 'anything_goes');
      if (isPublishedStatus(data.status)) {
        const embedSync = await syncPublishedEmbed(supabase, data);
        if (!embedSync.ok) {
          console.error(
            JSON.stringify({
              msg: 'Event saved but Discord embed sync failed',
              eventId: data.id,
              status: embedSync.status,
            }),
          );
        }
      }
      return jsonResponse({id: eventId, slug: data.slug}, 200, req);
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
        return jsonResponse({id: data.id, slug: data.slug}, 200, req);
      }
      if (error?.code !== '23505') {
        return jsonResponse({error: error?.message ?? 'Insert failed'}, 500, req);
      }
      slug = trySlug;
    }

    return jsonResponse({error: 'Could not create unique slug'}, 500, req);
  } catch (e) {
    return internalErrorResponse(req, e);
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
  return existing?.id ?? null;
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
