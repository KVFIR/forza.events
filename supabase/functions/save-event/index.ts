import {serve} from 'https://deno.land/std@0.224.0/http/server.ts';
import {syncPublishedEmbed, syncPublishedEmbedByEventId} from '../_shared/embedSync.ts';
import {
  assertTargetNotLocked,
  buildEventFields,
  buildEventRow,
  canEditPublishedEvent,
  type CarPayload,
  type SaveEventBody,
  validateDraft,
  validatePublishReady,
  validateRankedAgainstEvent,
  isPublishedStatus,
  eventHasStarted,
} from '../_shared/eventSpec.ts';
import {isGuildRatingEnabled} from '../_shared/applyEventRatings.ts';
import {API_ERROR_CODES} from '../_shared/apiErrorCodes.ts';
import {appErrorResponse, databaseErrorResponse, internalErrorResponse} from '../_shared/apiResponse.ts';
import {jsonResponse, optionsResponse} from '../_shared/cors.ts';
import {requireDiscordUser} from '../_shared/discordRequestAuth.ts';
import {ensureDiscordUserRow} from '../_shared/discordUserRow.ts';
import {resolveUserGuild} from '../_shared/guildAccess.ts';
import {buildGuildCatalogUpsert} from '../_shared/guildCatalog.ts';
import {resolveSaveCoverUrl} from '../_shared/eventCovers.ts';
import {slugify} from '../_shared/events.ts';
import {normalizeGuildName} from '../_shared/guildDisplay.ts';
import {resolveLobbyLeaderFields} from '../_shared/lobbyLeader.ts';
import {ensureConvoyLeaderParticipantForEvent, leaderFromEventRow} from '../_shared/participantLeader.ts';
import {PI_MAX} from '../_shared/pi.ts';
import {normalizeEventGame, type ForzaGame} from '../_shared/eventGames.ts';
import {rateLimitMutation} from '../_shared/rateLimitPresets.ts';
import {adminClient} from '../_shared/supabase.ts';
import {VALIDATION_CODES, type ValidationCode} from '../_shared/validationCodes.ts';
import {cancelPendingStartingSoonForEvent, deferNotificationDelivery} from '../_shared/notifications.ts';
import {
  enqueueConvoyLeaderChanged,
  enqueueEventCancelled,
  enqueueEventUpdated,
} from '../_shared/notificationTriggers.ts';
import {
  eventUpdateContentHash,
  normalizeCarsForDiff,
  scheduleChanged,
  tracksOrCarsChanged,
} from '../_shared/notificationDiff.ts';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === 'OPTIONS') return optionsResponse(req);
  if (req.method !== 'POST') return jsonResponse({error: 'Method not allowed'}, 405, req);

  const auth = await requireDiscordUser(req);
  if (auth instanceof Response) return auth;
  const {user: discordUser, token} = auth;

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
      if (error) return databaseErrorResponse(req, 'save-event delete', error);
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
      if (error) return databaseErrorResponse(req, 'save-event cancel', error);
      const {data: participants} = await supabase
        .from('event_participants')
        .select('discord_id, group_index, waitlisted, is_convoy_leader, gamertag_snapshot')
        .eq('event_id', body.id);
      if (updated) {
        await cancelPendingStartingSoonForEvent(supabase, body.id);
        if (participants?.length) {
          await enqueueEventCancelled(supabase, {
            id: updated.id,
            title: updated.title,
            host_discord_id: updated.host_discord_id,
            max_players: updated.max_players,
            group_count: updated.group_count,
            starts_at: updated.starts_at,
            timezone: updated.timezone_hint,
          }, participants);
          deferNotificationDelivery(supabase);
        }
      }
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

    const draftGuildId = body.guild_id?.trim();
    if (draftGuildId) {
      const guild = await resolveUserGuild(token!, draftGuildId);
      const guildName = normalizeGuildName(guild?.name);
      if (!guildName) {
        return appErrorResponse(req, 400, VALIDATION_CODES.GUILD_REQUIRED);
      }
      await supabase.from('discord_guilds').upsert(
        buildGuildCatalogUpsert(draftGuildId, guildName, guild),
        {onConflict: 'guild_id'},
      );
    }

    let existing: {
      id: string;
      host_discord_id: string;
      status: string;
      guild_id: string | null;
      channel_id: string | null;
      discord_message_id: string | null;
      starts_at: string;
      game?: string | null;
      is_ranked?: boolean | null;
      group_count?: number | null;
      cover_image_url: string | null;
      title: string;
      tracks: unknown;
      car_rule_mode: string;
      max_pi: number | null;
      additional_car_restrictions: string | null;
      lobby_leader_discord_id: string | null;
      lobby_leader_is_host: boolean | null;
      lobby_leader_gamertag: string | null;
    } | null = null;
    let existingCarFingerprint = '';

    if (body.id) {
      const {data} = await supabase
        .from('events')
        .select(
          'id, host_discord_id, status, guild_id, channel_id, discord_message_id, starts_at, game, is_ranked, group_count, cover_image_url, title, tracks, car_rule_mode, max_pi, additional_car_restrictions, lobby_leader_discord_id, lobby_leader_is_host, lobby_leader_gamertag',
        )
        .eq('id', body.id)
        .single();
      existing = data;
      if (existing?.discord_message_id) {
        const {data: eventCars} = await supabase
          .from('event_cars')
          .select('car_id, max_pi, tune_share_code, car_restrictions')
          .eq('event_id', body.id);
        existingCarFingerprint = normalizeCarsForDiff(
          existing.car_rule_mode,
          existing.max_pi,
          existing.additional_car_restrictions,
          eventCars ?? [],
        );
      }
      if (!existing || existing.host_discord_id !== discordUser.id) {
        return jsonResponse({error: 'Forbidden'}, 403, req);
      }
      if (!canEditPublishedEvent(existing)) {
        return jsonResponse({error: 'Published events cannot be edited after start'}, 403, req);
      }
      const lockErr = await assertTargetNotLocked(supabase, existing, body);
      if (lockErr) return appErrorResponse(req, 400, lockErr);
    }

    const isPublishedEdit = Boolean(existing && isPublishedStatus(existing.status));

    let lobbyResolved = isPublishedEdit && existing
      ? leaderFromEventRow({
        host_discord_id: discordUser.id,
        lobby_leader_discord_id: existing.lobby_leader_discord_id,
        lobby_leader_is_host: existing.lobby_leader_is_host,
        lobby_leader_gamertag: existing.lobby_leader_gamertag,
      })
      : await resolveLobbyLeaderFields(body, discordUser.id, supabase, {
        guildId: body.guild_id ?? existing?.guild_id,
      });
    if (!lobbyResolved) {
      return appErrorResponse(req, 400, VALIDATION_CODES.CONVOY_LEADER_REQUIRED);
    }
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

    const wantsRanked = Boolean(body.is_ranked);
    if (wantsRanked) {
      const guildForRanked =
        (isPublishedEdit ? existing?.guild_id : null) ??
        body.guild_id?.trim() ??
        existing?.guild_id ??
        null;
      const allowed = await isGuildRatingEnabled(supabase, guildForRanked);
      const rankedErr = validateRankedAgainstEvent(
        true,
        allowed,
        Boolean(existing?.is_ranked),
      );
      if (rankedErr) return appErrorResponse(req, 400, rankedErr);
    }

    const cars: CarPayload[] =
      body.car_rule_mode === 'restricted_list' ? body.cars ?? [] : [];

    // Resolve cars before touching the event row so CARS_UNRESOLVED never leaves an orphan draft.
    // Published edits keep the stored game (body.game omitted/wrong must not rewrite FH5→FH6).
    const eventGame =
      isPublishedEdit && existing
        ? normalizeEventGame(existing.game)
        : normalizeEventGame(body.game);
    const resolvedCars = await resolveEventCars(
      supabase,
      cars,
      body.car_rule_mode ?? 'anything_goes',
      eventGame,
    );
    if (typeof resolvedCars === 'string') return appErrorResponse(req, 400, resolvedCars);

    const coverUrl = resolveSaveCoverUrl(
      body.type ?? 'road',
      body.cover_image_url,
      existing?.cover_image_url,
    );
    const fields = buildEventFields(body, discordUser.id, coverUrl, lobbyResolved);
    if (isPublishedEdit) {
      fields.game = eventGame;
      // Ranked is locked after publish — keep stored flag regardless of client body.
      fields.is_ranked = Boolean(existing?.is_ranked);
    }
    const insertRow = buildEventRow(body, discordUser.id, coverUrl, lobbyResolved);

    let eventId = body.id;

    if (eventId) {
      const {data, error} = await supabase
        .from('events')
        .update(fields)
        .eq('id', eventId)
        .select('*')
        .single();
      if (error) return databaseErrorResponse(req, 'save-event update', error);
      if (!isPublishedEdit) {
        await ensureConvoyLeaderParticipantForEvent(
          supabase,
          {
            id: eventId,
            host_discord_id: discordUser.id,
            lobby_leader_discord_id: lobbyResolved.lobby_leader_discord_id,
            lobby_leader_is_host: lobbyResolved.lobby_leader_is_host,
            lobby_leader_gamertag: lobbyResolved.lobby_leader_gamertag,
          },
          lobbyResolved.lobby_leader_is_host
            ? undefined
            : {
                username: body.lobby_leader_username,
                avatar_url: body.lobby_leader_avatar_url,
              },
        );
      }
      const carErr = await persistEventCars(supabase, eventId, resolvedCars);
      if (carErr) return appErrorResponse(req, 400, carErr);
      if (isPublishedStatus(data.status)) {
        const embedSync = await syncPublishedEmbedByEventId(supabase, eventId);
        if (!embedSync.ok) {
          console.error(
            JSON.stringify({
              msg: 'Event saved but Discord embed sync failed',
              eventId: data.id,
              status: embedSync.status,
            }),
          );
        }
        if (existing?.discord_message_id) {
          const {data: participants} = await supabase
            .from('event_participants')
            .select('discord_id, group_index, waitlisted, is_convoy_leader, gamertag_snapshot')
            .eq('event_id', eventId);

          const eventRow = {
            id: data.id,
            title: data.title,
            host_discord_id: data.host_discord_id,
            max_players: data.max_players,
            group_count: data.group_count,
            starts_at: data.starts_at,
            timezone: data.timezone_hint,
          };

          const leaderChanged = !isPublishedEdit && (
            existing.lobby_leader_discord_id !== lobbyResolved.lobby_leader_discord_id ||
            existing.lobby_leader_is_host !== lobbyResolved.lobby_leader_is_host ||
            (existing.lobby_leader_gamertag ?? '').trim() !== lobbyResolved.lobby_leader_gamertag.trim()
          );

          if (leaderChanged) {
            await enqueueConvoyLeaderChanged(
              supabase,
              eventRow,
              participants ?? [],
              1,
              lobbyResolved.lobby_leader_gamertag,
              body.lobby_leader_username,
            );
          }

          const afterCarFingerprint = normalizeCarsForDiff(
            body.car_rule_mode ?? data.car_rule_mode,
            body.max_pi ?? data.max_pi,
            body.additional_car_restrictions ?? data.additional_car_restrictions,
            resolvedCars,
          );
          const diff = tracksOrCarsChanged(
            {tracks: existing.tracks, carFingerprint: existingCarFingerprint},
            {tracks: body.tracks ?? data.tracks, carFingerprint: afterCarFingerprint},
          );
          const scheduleDiff = scheduleChanged(existing.starts_at, data.starts_at);
          if (scheduleDiff) {
            await cancelPendingStartingSoonForEvent(supabase, eventId);
          }
          if (diff.tracks || diff.cars || scheduleDiff) {
            const contentHash = eventUpdateContentHash(
              diff.tracks,
              diff.cars,
              scheduleDiff,
              body.tracks ?? data.tracks,
              afterCarFingerprint,
              data.starts_at,
            );
            await enqueueEventUpdated(
              supabase,
              eventRow,
              participants ?? [],
              contentHash,
              body.tracks ?? data.tracks,
              body.car_rule_mode ?? data.car_rule_mode,
              body.max_pi ?? data.max_pi,
              body.additional_car_restrictions ?? data.additional_car_restrictions,
              resolvedCars.length,
              diff.tracks,
              diff.cars,
              scheduleDiff,
            );
          }

          deferNotificationDelivery(supabase);
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
        await ensureConvoyLeaderParticipantForEvent(
          supabase,
          {
            id: data.id,
            host_discord_id: discordUser.id,
            lobby_leader_discord_id: lobbyResolved.lobby_leader_discord_id,
            lobby_leader_is_host: lobbyResolved.lobby_leader_is_host,
            lobby_leader_gamertag: lobbyResolved.lobby_leader_gamertag,
          },
          lobbyResolved.lobby_leader_is_host
            ? undefined
            : {
                username: body.lobby_leader_username,
                avatar_url: body.lobby_leader_avatar_url,
              },
        );
        const carErr = await persistEventCars(supabase, data.id, resolvedCars);
        if (carErr) return appErrorResponse(req, 400, carErr);
        return jsonResponse({id: data.id, slug: data.slug}, 200, req);
      }
      if (error?.code !== '23505') {
        return databaseErrorResponse(req, 'save-event insert', error ?? {message: 'Insert failed'});
      }
      slug = trySlug;
    }

    return appErrorResponse(req, 500, API_ERROR_CODES.INTERNAL);
  } catch (e) {
    return internalErrorResponse(req, e);
  }
});

async function resolveCarIdByNaturalKey(
  supabase: ReturnType<typeof adminClient>,
  c: CarPayload,
  game: ForzaGame,
): Promise<string | null> {
  let q = supabase
    .from('cars')
    .select('id')
    .eq('game', game)
    .eq('make', c.make)
    .eq('model', c.model)
    .eq('pi', c.pi)
    .eq('active', true);
  if (c.year != null) q = q.eq('year', c.year);
  else q = q.is('year', null);
  const {data: existing, error} = await q.limit(1).maybeSingle();
  if (error) {
    console.error('resolveCarIdByNaturalKey', error, c);
    return null;
  }
  return existing?.id ?? null;
}

async function resolveCarId(
  supabase: ReturnType<typeof adminClient>,
  c: CarPayload,
  game: ForzaGame,
): Promise<string | null> {
  if (UUID_RE.test(c.id)) {
    const {data} = await supabase
      .from('cars')
      .select('id, game, active')
      .eq('id', c.id)
      .maybeSingle();
    if (data) {
      // Wrong-game or inactive UUID must not fall through to a different natural-key match.
      if (data.game !== game || data.active !== true) return null;
      return data.id;
    }
  }
  return resolveCarIdByNaturalKey(supabase, c, game);
}

type ResolvedEventCar = {
  car_id: string;
  max_pi: number;
  tune_share_code: string | null;
  car_restrictions: string[];
};

/** Resolve car natural keys to ids up front, so unresolved cars fail before any event row is written. */
async function resolveEventCars(
  supabase: ReturnType<typeof adminClient>,
  cars: CarPayload[],
  mode: 'anything_goes' | 'restricted_list',
  game: ForzaGame,
): Promise<ResolvedEventCar[] | ValidationCode> {
  if (mode !== 'restricted_list' || cars.length === 0) return [];

  const rows: ResolvedEventCar[] = [];
  const seenCarIds = new Set<string>();
  for (const c of cars) {
    const carId = await resolveCarId(supabase, c, game);
    if (!carId || seenCarIds.has(carId)) continue;
    seenCarIds.add(carId);
    rows.push({
      car_id: carId,
      max_pi: c.max_pi ?? PI_MAX,
      tune_share_code: c.tune_share_code?.trim() || null,
      car_restrictions: c.car_restrictions ?? [],
    });
  }

  if (rows.length < cars.length) {
    console.error(
      JSON.stringify({
        msg: 'save-event unresolved cars',
        requested: cars.length,
        resolved: rows.length,
      }),
    );
    return VALIDATION_CODES.CARS_UNRESOLVED;
  }

  return rows;
}

/** Replace an event's car rows with the pre-resolved set (cars are validated by resolveEventCars). */
async function persistEventCars(
  supabase: ReturnType<typeof adminClient>,
  eventId: string,
  resolved: ResolvedEventCar[],
): Promise<ValidationCode | null> {
  await supabase.from('event_cars').delete().eq('event_id', eventId);
  if (resolved.length === 0) return null;

  const {error} = await supabase
    .from('event_cars')
    .insert(resolved.map((r) => ({...r, event_id: eventId})));
  if (error) {
    console.error('persistEventCars insert', error);
    return VALIDATION_CODES.CARS_SYNC_FAILED;
  }
  return null;
}
