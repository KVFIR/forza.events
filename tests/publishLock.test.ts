import {describe, expect, it} from 'vitest';
import {API_ERROR_CODES} from '../src/lib/apiErrorCodes';
import {
  isAlreadyPublished,
  isDraftPublishable,
  isPublishInProgress,
  isPublishLockStale,
  publishClaimFailureCode,
  publishLockClaimOrFilter,
  PUBLISH_LOCK_TTL_SECONDS,
  publishLockStaleBefore,
} from '../supabase/functions/_shared/publishLock.ts';

const baseRow = {
  id: 'e1',
  host_discord_id: 'h1',
  status: 'draft',
  guild_id: 'g1',
  channel_id: 'c1',
  discord_message_id: null,
  publish_started_at: null,
};

describe('publishLock', () => {
  const now = Date.parse('2026-05-29T12:00:00.000Z');

  it('publishLockStaleBefore is TTL seconds before now', () => {
    const stale = publishLockStaleBefore(now);
    expect(stale).toBe('2026-05-29T11:55:00.000Z');
    expect(PUBLISH_LOCK_TTL_SECONDS).toBe(300);
  });

  it('publishLockClaimOrFilter quotes ISO timestamp for PostgREST', () => {
    const stale = '2026-05-29T11:55:00.000Z';
    expect(publishLockClaimOrFilter(stale)).toBe(
      'publish_started_at.is.null,publish_started_at.lt."2026-05-29T11:55:00.000Z"',
    );
  });

  it('isPublishLockStale is false for null', () => {
    expect(isPublishLockStale(null, now)).toBe(false);
  });

  it('isPublishLockStale is true when lock is older than TTL', () => {
    expect(isPublishLockStale('2026-05-29T11:54:00.000Z', now)).toBe(true);
  });

  it('isPublishLockStale is false for fresh lock', () => {
    expect(isPublishLockStale('2026-05-29T11:58:00.000Z', now)).toBe(false);
  });

  it('isAlreadyPublished requires open status and message id', () => {
    expect(isAlreadyPublished({...baseRow, status: 'open', discord_message_id: 'm1'})).toBe(
      true,
    );
    expect(isAlreadyPublished({...baseRow, status: 'draft', discord_message_id: 'm1'})).toBe(
      false,
    );
    expect(isAlreadyPublished({...baseRow, status: 'open', discord_message_id: null})).toBe(
      false,
    );
  });

  it('isPublishInProgress when fresh lock present', () => {
    expect(
      isPublishInProgress(
        {...baseRow, publish_started_at: '2026-05-29T11:58:00.000Z'},
        now,
      ),
    ).toBe(true);
    expect(
      isPublishInProgress(
        {...baseRow, publish_started_at: '2026-05-29T11:54:00.000Z'},
        now,
      ),
    ).toBe(false);
  });

  it('isDraftPublishable only for unpublished drafts', () => {
    expect(isDraftPublishable(baseRow)).toBe(true);
    expect(isDraftPublishable({...baseRow, status: 'open'})).toBe(false);
    expect(isDraftPublishable({...baseRow, discord_message_id: 'm1'})).toBe(false);
  });

  it('publishClaimFailureCode maps in-progress vs not draft', () => {
    expect(
      publishClaimFailureCode({
        ...baseRow,
        publish_started_at: new Date(now - 60_000).toISOString(),
      }),
    ).toBe(API_ERROR_CODES.PUBLISH_IN_PROGRESS);
    expect(publishClaimFailureCode({...baseRow, status: 'cancelled'})).toBe(
      API_ERROR_CODES.NOT_DRAFT,
    );
  });
});
