import {describe, expect, it, vi} from 'vitest';
import {coalesceInflight, dedupCacheKey} from '../src/lib/apiDedup';

describe('dedupCacheKey', () => {
  it('does not embed the raw secret', () => {
    const token = 'super-secret-discord-token';
    expect(dedupCacheKey('list-guilds', token)).not.toContain(token);
  });
});

describe('coalesceInflight', () => {
  it('dedupes parallel calls with the same key', async () => {
    const run = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return {guilds: []};
    });

    const [a, b] = await Promise.all([
      coalesceInflight('list-guilds:test', run),
      coalesceInflight('list-guilds:test', run),
    ]);

    expect(run).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });

  it('reuses cached results until fresh is requested', async () => {
    const run = vi
      .fn()
      .mockResolvedValueOnce({guilds: [{id: '1', name: 'A'}]})
      .mockResolvedValueOnce({guilds: [{id: '2', name: 'B'}]});

    const first = await coalesceInflight('list-guilds:cache', run, {cacheMs: 30_000});
    const second = await coalesceInflight('list-guilds:cache', run, {cacheMs: 30_000});
    const third = await coalesceInflight('list-guilds:cache', run, {
      cacheMs: 30_000,
      fresh: true,
    });

    expect(first).toEqual({guilds: [{id: '1', name: 'A'}]});
    expect(second).toEqual(first);
    expect(third).toEqual({guilds: [{id: '2', name: 'B'}]});
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('does not cache rejected requests', async () => {
    const run = vi
      .fn()
      .mockRejectedValueOnce(new Error('rate limited'))
      .mockResolvedValueOnce({guilds: []});

    await expect(
      coalesceInflight('list-guilds:fail', run, {cacheMs: 30_000}),
    ).rejects.toThrow('rate limited');
    await expect(coalesceInflight('list-guilds:fail', run, {cacheMs: 30_000})).resolves.toEqual({
      guilds: [],
    });
    expect(run).toHaveBeenCalledTimes(2);
  });
});
