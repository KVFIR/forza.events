import {API_ERROR_CODES, type ApiErrorCode} from './apiErrorCodes.ts';
import type {DiscordUser} from './discord.ts';
import {ensureDiscordUserRow} from './discordUserRow.ts';
import {syncPublishedEmbedByEventId} from './embedSync.ts';
import {firstOpenGroup} from './eventGroups.ts';
import {canLeaveEvent, eventHasStarted} from './eventSpec.ts';
import {
  shouldEnqueueHostGroupFilledOnJoin,
  shouldEnqueueHostGroupFilledOnPromote,
} from './notificationParticipation.ts';
import {enqueueHostGroupFilled, enqueueWaitlistSeatOpened} from './notificationTriggers.ts';
import {deferNotificationDelivery} from './notifications.ts';
import {parsePostgresRpcErrorCode} from './rpcErrors.ts';
import type {adminClient} from './supabase.ts';

const CLOSED_STATUSES = new Set(['completed', 'cancelled', 'archived']);

export type JoinEventOk = {
  ok: true;
  joined: boolean;
  waitlisted: boolean;
  group_index: number;
  embedSynced: boolean;
};

export type JoinEventErr = {
  ok: false;
  code: ApiErrorCode;
};

export type JoinEventResult = JoinEventOk | JoinEventErr;

export function joinEventHttpStatus(code: ApiErrorCode): number {
  if (code === API_ERROR_CODES.TOO_MANY_REQUESTS) return 429;
  if (code === API_ERROR_CODES.EVENT_FULL) return 409;
  if (code === API_ERROR_CODES.EVENT_NOT_FOUND) return 404;
  if (code === API_ERROR_CODES.INTERNAL) return 500;
  return 400;
}

function joinFail(code: ApiErrorCode): JoinEventErr {
  return {ok: false, code};
}

function upsertErrorCode(error: {message?: string; code?: string}): ApiErrorCode {
  const msg = error.message ?? '';
  if (msg.includes('foreign key') && msg.includes('users')) {
    return API_ERROR_CODES.PROFILE_INCOMPLETE;
  }
  const parsed = parsePostgresRpcErrorCode(error);
  if (parsed && (Object.values(API_ERROR_CODES) as string[]).includes(parsed)) {
    return parsed as ApiErrorCode;
  }
  console.error(JSON.stringify({msg: 'event join upsert', detail: msg, code: error.code}));
  return API_ERROR_CODES.INTERNAL;
}

/**
 * Same join as Activity `event-participation` (capacity, waitlist, host block).
 * Caller must pass a validated Xbox gamertag.
 */
export async function joinEventParticipant(
  supabase: ReturnType<typeof adminClient>,
  args: {
    eventId: string;
    discordUser: DiscordUser;
    gamertag: string;
    syncEmbed?: boolean;
  },
): Promise<JoinEventResult> {
  const {eventId, discordUser, gamertag} = args;
  const syncEmbed = args.syncEmbed !== false;

  const {data: event} = await supabase
    .from('events')
    .select(
      'max_players, group_count, current_players, status, starts_at, host_discord_id, title, timezone_hint',
    )
    .eq('id', eventId)
    .single();

  if (!event || event.status === 'draft') {
    return joinFail(API_ERROR_CODES.EVENT_NOT_FOUND);
  }
  if (event.host_discord_id === discordUser.id) {
    return joinFail(API_ERROR_CODES.HOST_CANNOT_JOIN);
  }
  if (CLOSED_STATUSES.has(event.status)) {
    return joinFail(API_ERROR_CODES.REGISTRATION_CLOSED);
  }
  if (eventHasStarted(event)) {
    return joinFail(API_ERROR_CODES.REGISTRATION_AFTER_START);
  }

  await ensureDiscordUserRow(supabase, discordUser);

  const {error: profileErr} = await supabase
    .from('users')
    .update({xbox_gamertag: gamertag})
    .eq('discord_id', discordUser.id);
  if (profileErr) {
    console.error(JSON.stringify({msg: 'event join profile', detail: profileErr.message}));
    return joinFail(API_ERROR_CODES.INTERNAL);
  }

  const {data: roster} = await supabase
    .from('event_participants')
    .select('discord_id, group_index, waitlisted, is_convoy_leader, participation_source')
    .eq('event_id', eventId);
  const existing = roster?.find((r) => r.discord_id === discordUser.id);

  let groupIndex = existing?.group_index ?? 1;
  let waitlisted: boolean;
  if (existing && !existing.waitlisted) {
    waitlisted = false;
  } else {
    const open = firstOpenGroup(roster ?? [], event.group_count ?? 1, event.max_players);
    if (open != null) {
      waitlisted = false;
      groupIndex = open;
    } else {
      waitlisted = true;
    }
  }

  const participationSource: string =
    existing?.participation_source === 'host_assigned' ||
    existing?.participation_source === 'host_self_assigned'
      ? existing.participation_source
      : 'self_join';

  const upsertRow = (wl: boolean) =>
    supabase.from('event_participants').upsert(
      {
        event_id: eventId,
        discord_id: discordUser.id,
        gamertag_snapshot: gamertag,
        waitlisted: wl,
        group_index: groupIndex,
        is_convoy_leader: existing?.is_convoy_leader ?? false,
        participation_source: participationSource,
      },
      {onConflict: 'event_id,discord_id'},
    );

  let {error} = await upsertRow(waitlisted);
  if (error && !waitlisted && (error.message ?? '').includes('EVENT_FULL')) {
    waitlisted = true;
    ({error} = await upsertRow(true));
  }

  if (error) return joinFail(upsertErrorCode(error));

  const eventRow = {
    id: eventId,
    title: event.title,
    host_discord_id: event.host_discord_id,
    max_players: event.max_players,
    group_count: event.group_count,
    starts_at: event.starts_at,
    timezone: event.timezone_hint,
  };

  if (
    !waitlisted &&
    shouldEnqueueHostGroupFilledOnJoin(
      existing,
      waitlisted,
      roster ?? [],
      groupIndex,
      discordUser.id,
      event.max_players,
      event.group_count ?? 1,
    )
  ) {
    await enqueueHostGroupFilled(supabase, eventRow, groupIndex);
    deferNotificationDelivery(supabase);
  }

  if (!syncEmbed) {
    return {ok: true, joined: !waitlisted, waitlisted, group_index: groupIndex, embedSynced: false};
  }

  const embedSync = await syncPublishedEmbedByEventId(supabase, eventId);
  if (!embedSync.ok) {
    console.error(
      JSON.stringify({
        msg: 'Joined event but Discord embed sync failed',
        eventId,
        status: embedSync.status,
      }),
    );
  }
  return {
    ok: true,
    joined: !waitlisted,
    waitlisted,
    group_index: groupIndex,
    embedSynced: embedSync.ok,
  };
}

export type LeaveEventOk = {
  ok: true;
  removed: boolean;
  embedSynced: boolean;
};

export type LeaveEventResult = LeaveEventOk | JoinEventErr;

function leaveFail(code: ApiErrorCode): JoinEventErr {
  return {ok: false, code};
}

export async function leaveEventParticipant(
  supabase: ReturnType<typeof adminClient>,
  args: {
    eventId: string;
    discordId: string;
    syncEmbed?: boolean;
  },
): Promise<LeaveEventResult> {
  const {eventId, discordId} = args;
  const syncEmbed = args.syncEmbed !== false;

  const {data: participant} = await supabase
    .from('event_participants')
    .select('is_convoy_leader')
    .eq('event_id', eventId)
    .eq('discord_id', discordId)
    .maybeSingle();

  if (participant?.is_convoy_leader) {
    return leaveFail(API_ERROR_CODES.LEADER_CANNOT_LEAVE);
  }

  const {data: event} = await supabase
    .from('events')
    .select('status, starts_at')
    .eq('id', eventId)
    .maybeSingle();

  if (!event || event.status === 'draft') {
    return leaveFail(API_ERROR_CODES.EVENT_NOT_FOUND);
  }
  if (!canLeaveEvent(event)) {
    return leaveFail(API_ERROR_CODES.REGISTRATION_AFTER_START);
  }

  const {data: leaveResult, error} = await supabase.rpc('leave_event_participant', {
    p_event_id: eventId,
    p_discord_id: discordId,
  });
  if (error) {
    const msg = error.message ?? '';
    if (msg.includes('foreign key') && msg.includes('users')) {
      return leaveFail(API_ERROR_CODES.PROFILE_INCOMPLETE);
    }
    const parsed = parsePostgresRpcErrorCode(error);
    if (parsed && (Object.values(API_ERROR_CODES) as string[]).includes(parsed)) {
      return leaveFail(parsed as ApiErrorCode);
    }
    console.error(JSON.stringify({msg: 'event leave rpc', detail: msg, code: error.code}));
    return leaveFail(API_ERROR_CODES.INTERNAL);
  }

  const removed = Boolean(
    leaveResult && typeof leaveResult === 'object' && (leaveResult as {removed?: boolean}).removed,
  );
  const promotedId =
    leaveResult && typeof leaveResult === 'object'
      ? ((leaveResult as {promoted_discord_id?: string | null}).promoted_discord_id ?? null)
      : null;

  if (removed && promotedId) {
    const {data: eventRow} = await supabase
      .from('events')
      .select('id, title, host_discord_id, max_players, group_count, starts_at, timezone_hint')
      .eq('id', eventId)
      .single();
    const {data: participants} = await supabase
      .from('event_participants')
      .select('discord_id, group_index, waitlisted, is_convoy_leader, gamertag_snapshot')
      .eq('event_id', eventId);
    if (eventRow && participants) {
      const groupIndex = participants.find((p) => p.discord_id === promotedId)?.group_index ?? 1;
      await enqueueWaitlistSeatOpened(supabase, eventRow, promotedId, groupIndex, participants);
      if (
        shouldEnqueueHostGroupFilledOnPromote(
          participants,
          groupIndex,
          eventRow.max_players,
          eventRow.group_count ?? 1,
        )
      ) {
        await enqueueHostGroupFilled(supabase, eventRow, groupIndex);
      }
      deferNotificationDelivery(supabase);
    }
  }

  if (!removed) {
    return {ok: true, removed: false, embedSynced: true};
  }
  if (!syncEmbed) {
    return {ok: true, removed: true, embedSynced: false};
  }

  const embedSync = await syncPublishedEmbedByEventId(supabase, eventId);
  if (!embedSync.ok) {
    console.error(
      JSON.stringify({
        msg: 'Left event but Discord embed sync failed',
        eventId,
        status: embedSync.status,
      }),
    );
  }
  return {ok: true, removed, embedSynced: embedSync.ok};
}
