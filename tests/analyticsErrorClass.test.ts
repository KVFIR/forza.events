import {describe, expect, it} from 'vitest';
import {
  apiErrorHealthStatus,
  buildErrorHeadline,
  classifiedCount,
  classifyApiError,
} from '../src/lib/analyticsErrorClass';

describe('classifyApiError', () => {
  it('splits INVALID_RESPONSE by HTTP status', () => {
    expect(classifyApiError('INVALID_RESPONSE', 200)).toBe('watch');
    expect(classifyApiError('INVALID_RESPONSE', 502)).toBe('bug');
    expect(classifyApiError('INVALID_RESPONSE', 520)).toBe('bug');
  });

  it('treats convoy-not-in-guild as expected and guild-check failure as watch', () => {
    expect(classifyApiError('CONVOY_LEADER_NOT_IN_GUILD')).toBe('expected');
    expect(classifyApiError('CONVOY_LEADER_GUILD_CHECK_FAILED')).toBe('watch');
  });

  it('maps token-exchange BAD_REQUEST to auth, other BAD_REQUEST to expected', () => {
    expect(classifyApiError('BAD_REQUEST', 400, 'token-exchange')).toBe('auth');
    expect(classifyApiError('BAD_REQUEST', 400, 'save-event')).toBe('expected');
  });
});

describe('buildErrorHeadline', () => {
  it('calls out browser auth when that dominates', () => {
    const headline = buildErrorHeadline({
      apiErrors: 36,
      totalEvents: 1000,
      activityErrors: 0,
      sessionExpired: 44,
      top: [{code: 'UNAUTHORIZED', function_name: 'host-drafts', count: 36}],
    });
    expect(headline.tone).toBe('warning');
    expect(headline.title).toMatch(/session/i);
  });

  it('treats network-only browser volume as noise', () => {
    const headline = buildErrorHeadline({
      apiErrors: 32,
      totalEvents: 1000,
      activityErrors: 0,
      sessionExpired: 0,
      top: [{code: 'NETWORK_ERROR', function_name: 'browse-events', count: 32}],
    });
    expect(headline.tone).toBe('info');
    expect(classifiedCount([{code: 'NETWORK_ERROR', count: 32}], 'noise')).toBe(32);
  });
});

describe('apiErrorHealthStatus', () => {
  it('does not go critical on browser network volume', () => {
    expect(
      apiErrorHealthStatus({
        apiErrors: 90,
        activityErrors: 0,
        top: [{code: 'NETWORK_ERROR', count: 90}],
      }),
    ).toBe('ok');
  });

  it('goes critical when Activity has gateway bugs', () => {
    expect(
      apiErrorHealthStatus({
        apiErrors: 4,
        activityErrors: 2,
        top: [{code: 'INVALID_RESPONSE', http_status: 502, count: 2}],
      }),
    ).toBe('critical');
  });
});
