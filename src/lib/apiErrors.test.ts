import {describe, expect, it} from 'vitest';
import {API_ERROR_CODES} from './apiErrorCodes';
import {ApiRequestError, isUnauthorizedApiError} from './apiErrors';

describe('isUnauthorizedApiError', () => {
  it('matches ApiRequestError by code even when message is i18n copy', () => {
    const err = new ApiRequestError('Sign in to continue.', {
      code: API_ERROR_CODES.UNAUTHORIZED,
      status: 401,
    });
    expect(isUnauthorizedApiError(err)).toBe(true);
  });

  it('matches by HTTP 401 without code', () => {
    const err = new ApiRequestError('Войдите, чтобы продолжить.', {status: 401});
    expect(isUnauthorizedApiError(err)).toBe(true);
  });

  it('rejects other errors and bare Error with unauthorized-ish text', () => {
    expect(isUnauthorizedApiError(new Error('Unauthorized'))).toBe(false);
    expect(
      isUnauthorizedApiError(
        new ApiRequestError('nope', {code: API_ERROR_CODES.FORBIDDEN, status: 403}),
      ),
    ).toBe(false);
  });
});
