import {describe, expect, it} from 'vitest';
import {
  ApiRequestError,
  isTransientApiError,
  isTransientApiErrorCode,
  shouldClearChannelAfterValidationFailure,
} from '../src/lib/apiErrors';
import {API_ERROR_CODES} from '../src/lib/apiErrorCodes';

describe('isTransientApiError', () => {
  it('treats rate limits and gateway errors as transient', () => {
    expect(isTransientApiError(new ApiRequestError('slow', {status: 429}))).toBe(true);
    expect(isTransientApiError(new ApiRequestError('bad gw', {status: 503}))).toBe(true);
    expect(
      isTransientApiError(
        new ApiRequestError('limit', {
          status: 503,
          code: API_ERROR_CODES.TOO_MANY_REQUESTS,
        }),
      ),
    ).toBe(true);
  });

  it('treats fetch failures as transient', () => {
    expect(isTransientApiError(new TypeError('Failed to fetch'))).toBe(true);
  });

  it('does not treat INTERNAL or channel permission errors as transient', () => {
    expect(
      isTransientApiError(
        new ApiRequestError('oops', {status: 500, code: API_ERROR_CODES.INTERNAL}),
      ),
    ).toBe(false);
    expect(
      isTransientApiError(
        new ApiRequestError('nope', {
          status: 403,
          code: API_ERROR_CODES.BOT_CANNOT_POST,
        }),
      ),
    ).toBe(false);
  });
});

describe('isTransientApiErrorCode', () => {
  it('matches server retry codes', () => {
    expect(isTransientApiErrorCode(API_ERROR_CODES.TOO_MANY_REQUESTS)).toBe(true);
    expect(isTransientApiErrorCode(API_ERROR_CODES.NETWORK_ERROR)).toBe(true);
    expect(isTransientApiErrorCode(API_ERROR_CODES.INTERNAL)).toBe(false);
    expect(isTransientApiErrorCode(API_ERROR_CODES.BOT_CANNOT_POST)).toBe(false);
  });
});

describe('shouldClearChannelAfterValidationFailure', () => {
  it('never clears on revalidate', () => {
    expect(
      shouldClearChannelAfterValidationFailure(
        'revalidate',
        new ApiRequestError('nope', {code: API_ERROR_CODES.BOT_CANNOT_POST}),
      ),
    ).toBe(false);
  });

  it('clears on user pick with permanent channel error', () => {
    expect(
      shouldClearChannelAfterValidationFailure(
        'user',
        null,
        API_ERROR_CODES.BOT_CANNOT_POST,
      ),
    ).toBe(true);
  });

  it('does not clear on user pick with transient error', () => {
    expect(
      shouldClearChannelAfterValidationFailure(
        'user',
        new ApiRequestError('slow', {status: 429}),
      ),
    ).toBe(false);
  });
});
