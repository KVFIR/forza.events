import {beforeEach, describe, expect, it, vi} from 'vitest';

const rpcMock = vi.fn();

vi.mock('@edge/supabase.ts', () => ({
  adminClient: () => ({rpc: rpcMock}),
}));

describe('enforceRateLimit', () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it('allows when RPC returns true', async () => {
    rpcMock.mockResolvedValue({data: true, error: null});
    const {enforceRateLimit} = await import('@edge/rateLimit.ts');
    await expect(enforceRateLimit('k', 10, 60)).resolves.toBe(true);
  });

  it('denies when RPC returns false', async () => {
    rpcMock.mockResolvedValue({data: false, error: null});
    const {enforceRateLimit} = await import('@edge/rateLimit.ts');
    await expect(enforceRateLimit('k', 10, 60)).resolves.toBe(false);
  });

  it('fail-closed when RPC errors', async () => {
    rpcMock.mockResolvedValue({data: null, error: {message: 'connection failed'}});
    const {enforceRateLimit} = await import('@edge/rateLimit.ts');
    await expect(enforceRateLimit('k', 10, 60)).resolves.toBe(false);
  });

  it('fail-closed when RPC throws', async () => {
    rpcMock.mockRejectedValue(new Error('timeout'));
    const {enforceRateLimit} = await import('@edge/rateLimit.ts');
    await expect(enforceRateLimit('k', 10, 60)).resolves.toBe(false);
  });
});
