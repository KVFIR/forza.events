import {describe, expect, it} from 'vitest';
import {API_ERROR_CODES} from '../src/lib/apiErrorCodes';
import {parseRpcExceptionCode} from '../supabase/functions/_shared/rpcErrors.ts';

describe('parseRpcExceptionCode', () => {
  it('extracts stable code from Postgres error text', () => {
    expect(parseRpcExceptionCode('RESULTS_ALREADY_SUBMITTED')).toBe(
      API_ERROR_CODES.RESULTS_ALREADY_SUBMITTED,
    );
    expect(parseRpcExceptionCode('ERROR: FORBIDDEN')).toBe(API_ERROR_CODES.FORBIDDEN);
    expect(parseRpcExceptionCode('duplicate key value violates unique constraint')).toBe(null);
  });

  it('prefers longer known codes in message', () => {
    expect(parseRpcExceptionCode('RESULTS_ALREADY_SUBMITTED')).toBe(
      API_ERROR_CODES.RESULTS_ALREADY_SUBMITTED,
    );
  });

  it('returns null for unknown messages', () => {
    expect(parseRpcExceptionCode('relation does not exist')).toBe(null);
    expect(parseRpcExceptionCode(undefined)).toBe(null);
  });
});
