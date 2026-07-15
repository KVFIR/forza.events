import {sendUserDm} from './discordDm.ts';
import {
  buildNotificationEmbed,
  isKnownNotificationKind,
  openEventButtonLabel,
  WAITLIST_NOTIFICATION_KINDS,
  type NotificationKind,
} from './notificationCopy.ts';
import {formatStartsAtForNotify, summarizeCarsForNotify} from './notificationTriggers.ts';
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
  notification_locale: string | null;
};

export async function enqueueNotifications(
  supabase: ReturnType<typeof adminClient>,
  rows: OutboxInsert[],
): Promise<void> {
  if (!rows.length) return;
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
    return;
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

  for (const row of batch) {
    const kind = row.kind as string;
    if (!isKnownNotificationKind(kind)) {
      await markOutbox(supabase, row.id, 'skipped', row.attempts, 'unknown_kind');
      skipped += 1;
      continue;
    }

    const {data: userRow} = await supabase
      .from('users')
      .select('discord_id, dm_notifications_enabled, notification_locale')
      .eq('discord_id', row.recipient_discord_id)
      .maybeSingle();

    const user = userRow as UserNotifyRow | null;
    if (!user) {
      await markOutbox(supabase, row.id, 'skipped', row.attempts, 'user_not_found');
      skipped += 1;
      continue;
    }

    if (!user.dm_notifications_enabled && !bypassesDmOptOut(kind, row.payload as Record<string, unknown>)) {
      await markOutbox(supabase, row.id, 'skipped', row.attempts, 'notifications_disabled');
      skipped += 1;
      continue;
    }

    const payload = enrichPayloadForSend(kind, row.payload as Record<string, unknown>, user.notification_locale);
    const embed = buildNotificationEmbed(kind, user.notification_locale, payload);
    const result = await sendUserDm(
      row.recipient_discord_id,
      row.event_id,
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
    (kind === 'event_starting_soon' || kind === 'host_event_starting_soon') &&
    out.startsAt &&
    out.timezone
  ) {
    out.startsAtLocal = formatStartsAtForNotify(out.startsAt, out.timezone, locale);
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
