import {describe, expect, it} from 'vitest';
import {
  EVENT_PUBLISHED_DELAY_MS,
  eventPublishedScheduledFor,
  filterNewEventAlertRecipients,
  resolvePublishedSendCtx,
  skipEventPublishedSend,
} from '../supabase/functions/_shared/notificationTriggers.ts';

describe('eventPublishedScheduledFor', () => {
  it('schedules one hour after publish', () => {
    expect(eventPublishedScheduledFor(0)).toBe(new Date(EVENT_PUBLISHED_DELAY_MS).toISOString());
  });
});

describe('filterNewEventAlertRecipients', () => {
  it('drops the host and anyone already on the roster', () => {
    expect(filterNewEventAlertRecipients(['host', 'joined', 'fan'], 'host', ['joined'])).toEqual([
      'fan',
    ]);
  });
});

describe('skipEventPublishedSend', () => {
  const base = {
    prefEnabled: true,
    eventStatus: 'open',
    hostDiscordId: 'host',
    recipientDiscordId: 'fan',
    onRoster: false,
  };

  it('sends when pref is on and the event is still upcoming or live', () => {
    expect(skipEventPublishedSend(base)).toBeNull();
    expect(skipEventPublishedSend({...base, eventStatus: 'live'})).toBeNull();
  });

  it('skips cancel, archive, completed, draft, host, roster, and opt-out', () => {
    expect(skipEventPublishedSend({...base, prefEnabled: false})).toBe('new_event_alerts_disabled');
    expect(skipEventPublishedSend({...base, eventStatus: 'cancelled'})).toBe('event_cancelled');
    expect(skipEventPublishedSend({...base, eventStatus: 'archived'})).toBe('event_cancelled');
    expect(skipEventPublishedSend({...base, eventStatus: 'completed'})).toBe('event_completed');
    expect(skipEventPublishedSend({...base, eventStatus: 'draft'})).toBe('not_published');
    expect(skipEventPublishedSend({...base, eventStatus: null})).toBe('event_not_found');
    expect(skipEventPublishedSend({...base, recipientDiscordId: 'host'})).toBe('is_host');
    expect(skipEventPublishedSend({...base, onRoster: true})).toBe('already_registered');
  });
});

describe('resolvePublishedSendCtx', () => {
  const event = {status: 'open', host_discord_id: 'host'};

  it('retries when the event or roster query fails', () => {
    expect(resolvePublishedSendCtx(event, true, ['joined'], false)).toBe('load_failed');
    expect(resolvePublishedSendCtx(event, false, ['joined'], true)).toBe('load_failed');
  });

  it('treats a missing event as not found, not an empty roster', () => {
    expect(resolvePublishedSendCtx(null, false, null, false)).toBeNull();
  });

  it('keeps roster ids when both reads succeed', () => {
    const ctx = resolvePublishedSendCtx(event, false, ['joined'], false);
    expect(ctx).not.toBe('load_failed');
    expect(ctx?.roster.has('joined')).toBe(true);
    expect(ctx?.hostDiscordId).toBe('host');
  });
});
