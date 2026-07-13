import {describe, expect, it} from 'vitest';
import {API_ERROR_CODES} from '../src/lib/apiErrorCodes';
import {
  parseRpcExceptionCode,
  responseForRpcException,
} from '../supabase/functions/_shared/rpcErrors.ts';

const req = new Request('https://forza.events');

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

  it('maps participation and group RPC codes', () => {
    expect(parseRpcExceptionCode('EVENT_FULL')).toBe(API_ERROR_CODES.EVENT_FULL);
    expect(parseRpcExceptionCode('LEADER_CANNOT_LEAVE')).toBe(
      API_ERROR_CODES.LEADER_CANNOT_LEAVE,
    );
    expect(parseRpcExceptionCode('LEADER_ALREADY_CONVOY_LEADER')).toBe(
      API_ERROR_CODES.LEADER_ALREADY_CONVOY_LEADER,
    );
    expect(parseRpcExceptionCode('INVALID_GROUP_INDEX')).toBe(API_ERROR_CODES.BAD_REQUEST);
  });

  it('returns null for unknown messages', () => {
    expect(parseRpcExceptionCode('relation does not exist')).toBe(null);
    expect(parseRpcExceptionCode(undefined)).toBe(null);
  });
});

describe('responseForRpcException', () => {
  it('maps conflict codes to HTTP 409', async () => {
    for (const message of ['RESULTS_ALREADY_SUBMITTED', 'EVENT_FULL'] as const) {
      const res = responseForRpcException(req, message);
      expect(res?.status).toBe(409);
      await expect(res!.json()).resolves.toMatchObject({code: message});
    }
  });

  it('maps LEADER_CANNOT_LEAVE to HTTP 400', async () => {
    const res = responseForRpcException(req, 'LEADER_CANNOT_LEAVE');
    expect(res?.status).toBe(400);
    await expect(res!.json()).resolves.toMatchObject({
      code: API_ERROR_CODES.LEADER_CANNOT_LEAVE,
    });
  });
});
