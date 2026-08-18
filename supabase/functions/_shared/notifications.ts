import {sendUserDm} from './discordDm.ts';
import {eventGameLabelEn, normalizeEventGame} from './eventGames.ts';
import {
  buildNotificationEmbed,
  isKnownNotificationKind,
  notifyEventTypeLabel,
  openEventButtonLabel,
  WAITLIST_NOTIFICATION_KINDS,
  type NotificationKind,
} from './notificationCopy.ts';
import {
  formatStartsAtForNotify,
  resolvePublishedSendCtx,
  skipEventPublishedSend,
  summarizeCarsForNotify,
  type PublishedSendCtx,
} from './notificationTriggers.ts';
import type {adminClient} from './supabase.ts';

declare const EdgeRuntime: {waitUntil: (promise: Promise<unknown>) => void} | undefined;

export type OutboxInsert = {
  kind: NotificationKind;
  event_id: string;
  recipient_discord_id: string;
  payload?: Record<string, unknown>;
  dedupe_key: string;
  scheduled_for?: string;
};

type UserNotifyRow = {
  discord_id: string;
  dm_notifications_enabled: boolean;
  new_event_notifications_enabled?: boolean | null;
  notification_locale: string | null;
};

export async function enqueueNotifications(
  supabase: ReturnType<typeof adminClient>,
  rows: OutboxInsert[],
): Promise<boolean> {
  if (!rows.length) return true;
  const {error} = await supabase.from('notification_outbox').upsert(
    rows.map((r) => ({
      kind: r.kind,
      event_id: r.event_id,
      recipient_discord_id: r.recipient_discord_id,
      payload: r.payload ?? {},
      dedupe_key: r.dedupe_key,
      scheduled_for: r.scheduled_for ?? new Date().toISOString(),
      status: 'pending',
    })),
    {onConflict: 'dedupe_key', ignoreDuplicates: true},
  );
  if (error) {
    console.error(JSON.stringify({msg: 'enqueueNotifications failed', detail: error.message}));
    return false;
  }

  const dedupeKeys = rows.map((r) => r.dedupe_key);
  const {error: retryErr} = await supabase
    .from('notification_outbox')
    .update({status: 'pending', attempts: 0, last_error: null, scheduled_for: new Date().toISOString()})
    .in('dedupe_key', dedupeKeys)
    .eq('status', 'failed');
  if (retryErr) {
    console.error(JSON.stringify({msg: 'enqueueNotifications retry failed', detail: retryErr.message}));
  }
  return true;
}

export async function cancelPendingStartingSoonForEvent(
  supabase: ReturnType<typeof adminClient>,
  eventId: string,
): Promise<void> {
  const {error} = await supabase
    .from('notification_outbox')
    .update({status: 'skipped', last_error: 'schedule_changed'})
    .eq('event_id', eventId)
    .in('kind', ['event_starting_soon', 'host_event_starting_soon'])
    .in('status', ['pending', 'processing']);
  if (error) {
    console.error(JSON.stringify({
      msg: 'cancelPendingStartingSoonForEvent failed',
      eventId,
      detail: error.message,
    }));
  }
}

export function deferNotificationDelivery(supabase: ReturnType<typeof adminClient>, limit = 25): void {
  const work = () => processNotificationBatch(supabase, limit);
  if (typeof EdgeRuntime !== 'undefined' && typeof EdgeRuntime.waitUntil === 'function') {
    EdgeRuntime.waitUntil(work());
  } else {
    void work();
  }
}

export function bypassesDmOptOut(kind: NotificationKind, payload: Record<string, unknown>): boolean {
  if (WAITLIST_NOTIFICATION_KINDS.has(kind)) return true;
  // Reschedule affects everyone registered or queued — send even when bell is off.
  return kind === 'event_updated' && payload.scheduleChanged === '1';
}

export async function processNotificationBatch(
  supabase: ReturnType<typeof adminClient>,
  limit: number,
): Promise<{processed: number; sent: number; failed: number; skipped: number}> {
  const {data: batch, error} = await supabase.rpc('claim_notification_outbox_batch', {
    p_limit: limit,
  });

  if (error || !batch?.length) {
    if (error) {
      console.error(JSON.stringify({msg: 'claim_notification_outbox_batch failed', detail: error.message}));
    }
    return {processed: 0, sent: 0, failed: 0, skipped: 0};
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const publishedCtx = new Map<string, PublishedSendCtx | null | 'load_failed'>();
  const eventUrlKeyById = await loadEventUrlKeys(
    supabase,
    batch.map((row: {event_id: string}) => row.event_id),
  );

  for (const row of batch) {
    const kind = row.kind as string;
    if (!isKnownNotificationKind(kind)) {
      await markOutbox(supabase, row.id, 'skipped', row.attempts, 'unknown_kind');
      skipped += 1;
      continue;
    }

    const {data: userRow, error: userErr} = await supabase
      .from('users')
      .select()
      .eq('discord_id', row.recipient_discord_id)
      .maybeSingle();

    const user = userRow as UserNotifyRow | null;
    if (userErr) {
      console.error(JSON.stringify({
        msg: 'notification user load failed',
        detail: userErr.message,
      }));
      const attempts = row.attempts + 1;
      const status = attempts >= 5 ? 'failed' : 'pending';
      await markOutbox(supabase, row.id, status, attempts, 'user_load_failed');
      failed += attempts >= 5 ? 1 : 0;
      continue;
    }
    if (!user) {
      await markOutbox(supabase, row.id, 'skipped', row.attempts, 'user_not_found');
      skipped += 1;
      continue;
    }

    if (kind === 'event_published') {
      const ctx = await loadPublishedSendCtx(supabase, row.event_id, publishedCtx);
      if (ctx === 'load_failed') {
        const attempts = row.attempts + 1;
        const status = attempts >= 5 ? 'failed' : 'pending';
        await markOutbox(supabase, row.id, status, attempts, 'event_load_failed');
        failed += attempts >= 5 ? 1 : 0;
        continue;
      }
      const reason = skipEventPublishedSend({
        prefEnabled: user.new_event_notifications_enabled === true,
        eventStatus: ctx?.status,
        hostDiscordId: ctx?.hostDiscordId,
        recipientDiscordId: row.recipient_discord_id,
        onRoster: ctx?.roster.has(row.recipient_discord_id) === true,
      });
      if (reason) {
        await markOutbox(supabase, row.id, 'skipped', row.attempts, reason);
        skipped += 1;
        continue;
      }
    } else if (!user.dm_notifications_enabled && !bypassesDmOptOut(kind, row.payload as Record<string, unknown>)) {
      await markOutbox(supabase, row.id, 'skipped', row.attempts, 'notifications_disabled');
      skipped += 1;
      continue;
    }

    const payload = enrichPayloadForSend(kind, row.payload as Record<string, unknown>, user.notification_locale);
    const embed = buildNotificationEmbed(kind, user.notification_locale, payload);
    const result = await sendUserDm(
      row.recipient_discord_id,
      eventUrlKeyById.get(row.event_id) ?? row.event_id,
      embed,
      openEventButtonLabel(user.notification_locale),
    );

    if (result.ok) {
      await markOutbox(supabase, row.id, 'sent', row.attempts + 1, null);
      sent += 1;
    } else if (result.skipRetry) {
      await markOutbox(supabase, row.id, 'skipped', row.attempts + 1, result.detail);
      skipped += 1;
    } else {
      const attempts = row.attempts + 1;
      const status = attempts >= 5 ? 'failed' : 'pending';
      await markOutbox(supabase, row.id, status, attempts, result.detail);
      failed += attempts >= 5 ? 1 : 0;
    }

    await sleep(350);
  }

  return {processed: batch.length, sent, failed, skipped};
}

async function markOutbox(
  supabase: ReturnType<typeof adminClient>,
  id: string,
  status: string,
  attempts: number,
  lastError: string | null,
): Promise<void> {
  const patch: Record<string, unknown> = {
    status,
    attempts,
    last_error: lastError,
  };
  if (status === 'sent') patch.sent_at = new Date().toISOString();
  await supabase.from('notification_outbox').update(patch).eq('id', id);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function loadEventUrlKeys(
  supabase: ReturnType<typeof adminClient>,
  eventIds: string[],
): Promise<Map<string, string>> {
  const ids = [...new Set(eventIds.filter(Boolean))];
  const map = new Map<string, string>();
  if (ids.length === 0) return map;
  const {data, error} = await supabase.from('events').select('id, slug').in('id', ids);
  if (error) {
    console.error(JSON.stringify({msg: 'notification event slug load failed', detail: error.message}));
    return map;
  }
  for (const row of data ?? []) {
    const slug = typeof row.slug === 'string' ? row.slug.trim() : '';
    map.set(row.id, slug || row.id);
  }
  return map;
}

export function enrichPayloadForSend(
  kind: NotificationKind,
  payload: Record<string, unknown>,
  locale: string | null | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (v != null) out[k] = String(v);
  }
  if (
    (kind === 'event_starting_soon' || kind === 'host_event_starting_soon' || kind === 'event_published') &&
    out.startsAt &&
    out.timezone
  ) {
    out.startsAtLocal = formatStartsAtForNotify(out.startsAt, out.timezone, locale);
  }
  if (kind === 'event_published') {
    out.typeLabel = notifyEventTypeLabel(out.eventType, locale);
    out.gameLabel = eventGameLabelEn(normalizeEventGame(out.game));
  }
  if (kind === 'event_updated') {
    const lng = locale === 'ru' ? 'ru' : 'en';
    if (out.scheduleChanged === '1' && out.startsAt) {
      out.scheduleSummary = formatStartsAtForNotify(out.startsAt, out.timezone, locale);
    }
    if (out.tracksChanged === '1') {
      try {
        const names = JSON.parse(out.trackNames || '[]') as string[];
        out.tracksSummary = names.length
          ? names.join(', ')
          : (lng === 'ru' ? 'Список трасс обновлён' : 'Track list updated');
      } catch {
        out.tracksSummary = lng === 'ru' ? 'Список трасс обновлён' : 'Track list updated';
      }
    }
    if (out.carsChanged === '1') {
      const rawMaxPi = out.maxPi;
      const maxPi =
        rawMaxPi === '' || rawMaxPi == null
          ? null
          : Number.isFinite(Number(rawMaxPi))
          ? Number(rawMaxPi)
          : null;
      out.carsSummary = summarizeCarsForNotify(
        out.carMode || 'anything_goes',
        maxPi,
        typeof out.additionalCarRestrictions === 'string' ? out.additionalCarRestrictions : null,
        Number(out.carCount) || 0,
        lng,
      ) ?? '';
    }
  }
  return out;
}

async function loadPublishedSendCtx(
  supabase: ReturnType<typeof adminClient>,
  eventId: string,
  cache: Map<string, PublishedSendCtx | null | 'load_failed'>,
): Promise<PublishedSendCtx | null | 'load_failed'> {
  if (cache.has(eventId)) return cache.get(eventId) ?? null;

  const {data: event, error: eventErr} = await supabase
    .from('events')
    .select('status, host_discord_id')
    .eq('id', eventId)
    .maybeSingle();
  const {data: participants, error: partErr} = eventErr || !event
    ? {data: null, error: null}
    : await supabase
      .from('event_participants')
      .select('discord_id')
      .eq('event_id', eventId);

  const ctx = resolvePublishedSendCtx(
    event,
    Boolean(eventErr),
    (participants ?? []).map((p) => p.discord_id as string),
    Boolean(partErr),
  );
  cache.set(eventId, ctx);
  return ctx;
}
