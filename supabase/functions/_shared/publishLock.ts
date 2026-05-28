import {API_ERROR_CODES, type ApiErrorCode} from './apiErrorCodes.ts';
import type {adminClient} from './supabase.ts';

export const PUBLISH_LOCK_TTL_SECONDS = 300;

/** ISO timestamp: locks older than this may be reclaimed. */
export function publishLockStaleBefore(nowMs = Date.now()): string {
  return new Date(nowMs - PUBLISH_LOCK_TTL_SECONDS * 1000).toISOString();
}

export function isPublishLockStale(
  publishStartedAt: string | null | undefined,
  nowMs = Date.now(),
): boolean {
  if (!publishStartedAt) return false;
  return new Date(publishStartedAt).getTime() < nowMs - PUBLISH_LOCK_TTL_SECONDS * 1000;
}

/** PostgREST `.or()` filter; timestamp must be quoted (colons in ISO-8601). */
export function publishLockClaimOrFilter(staleBefore: string): string {
  return `publish_started_at.is.null,publish_started_at.lt."${staleBefore}"`;
}

export type PublishableEventRow = {
  id: string;
  host_discord_id: string;
  status: string;
  guild_id: string | null;
  channel_id: string | null;
  discord_message_id: string | null;
  publish_started_at: string | null;
};

export function isAlreadyPublished(row: PublishableEventRow): boolean {
  return Boolean(
    row.discord_message_id &&
      row.status === 'open' &&
      row.channel_id &&
      row.guild_id,
  );
}

export function isPublishInProgress(
  row: PublishableEventRow,
  nowMs = Date.now(),
): boolean {
  return Boolean(
    row.publish_started_at && !isPublishLockStale(row.publish_started_at, nowMs),
  );
}

export function isDraftPublishable(row: PublishableEventRow): boolean {
  return row.status === 'draft' && !row.discord_message_id;
}

/** API code when `claimPublishLock` returned no row (caller should re-check idempotent publish). */
export function publishClaimFailureCode(row: PublishableEventRow): ApiErrorCode {
  if (isPublishInProgress(row)) return API_ERROR_CODES.PUBLISH_IN_PROGRESS;
  if (!isDraftPublishable(row)) return API_ERROR_CODES.NOT_DRAFT;
  return API_ERROR_CODES.PUBLISH_IN_PROGRESS;
}

export async function claimPublishLock(
  supabase: ReturnType<typeof adminClient>,
  eventId: string,
  hostId: string,
  target: {guildId: string; channelId: string},
): Promise<PublishableEventRow | null> {
  const staleBefore = publishLockStaleBefore();
  const {data, error} = await supabase
    .from('events')
    .update({
      publish_started_at: new Date().toISOString(),
      guild_id: target.guildId,
      channel_id: target.channelId,
    })
    .eq('id', eventId)
    .eq('host_discord_id', hostId)
    .eq('status', 'draft')
    .is('discord_message_id', null)
    .or(publishLockClaimOrFilter(staleBefore))
    .select(
      'id, host_discord_id, status, guild_id, channel_id, discord_message_id, publish_started_at',
    )
    .maybeSingle();

  if (error) {
    console.error(JSON.stringify({msg: 'claimPublishLock failed', eventId, detail: error.message}));
    throw error;
  }
  return data;
}

export async function clearPublishLock(
  supabase: ReturnType<typeof adminClient>,
  eventId: string,
): Promise<void> {
  const {error} = await supabase
    .from('events')
    .update({publish_started_at: null})
    .eq('id', eventId);
  if (error) {
    console.error(JSON.stringify({msg: 'clearPublishLock failed', eventId, detail: error.message}));
  }
}

export async function finalizePublish(
  supabase: ReturnType<typeof adminClient>,
  eventId: string,
  target: {messageId: string; guildId: string; channelId: string},
): Promise<PublishableEventRow | null> {
  const {data, error} = await supabase
    .from('events')
    .update({
      status: 'open',
      discord_message_id: target.messageId,
      guild_id: target.guildId,
      channel_id: target.channelId,
      publish_started_at: null,
    })
    .eq('id', eventId)
    .eq('status', 'draft')
    .not('publish_started_at', 'is', null)
    .select(
      'id, host_discord_id, status, guild_id, channel_id, discord_message_id, publish_started_at',
    )
    .maybeSingle();

  if (error) {
    console.error(JSON.stringify({msg: 'finalizePublish failed', eventId, detail: error.message}));
    throw error;
  }
  return data;
}

export async function loadPublishedSnapshot(
  supabase: ReturnType<typeof adminClient>,
  eventId: string,
): Promise<PublishableEventRow | null> {
  const {data, error} = await supabase
    .from('events')
    .select(
      'id, host_discord_id, status, guild_id, channel_id, discord_message_id, publish_started_at',
    )
    .eq('id', eventId)
    .maybeSingle();

  if (error) {
    console.error(
      JSON.stringify({msg: 'loadPublishedSnapshot failed', eventId, detail: error.message}),
    );
    throw error;
  }
  return data;
}

export type PublishedEventIds = {
  message_id: string;
  channel_id: string;
  guild_id: string;
};

export function publishedEventResponsePayload(
  row: PublishableEventRow,
): PublishedEventIds & {already_published: true} {
  return {
    message_id: row.discord_message_id!,
    channel_id: row.channel_id!,
    guild_id: row.guild_id!,
    already_published: true,
  };
}
