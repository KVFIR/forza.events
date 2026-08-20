import {afterEach, describe, expect, it, vi} from 'vitest';
import {
  DiscordRateLimitError,
  clientStatusForDiscordOAuthRefresh,
  discordAccessTokenFrom,
  isDiscordRateLimitError,
  verifyDiscordToken,
} from '../supabase/functions/_shared/discord.ts';
import {requireDiscordUser, optionalDiscordUser} from '../supabase/functions/_shared/discordRequestAuth.ts';

describe('discordAccessTokenFrom', () => {
  it('reads only x-discord-access-token', () => {
    const req = new Request('https://example.test', {
      headers: {
        authorization: 'Bearer supabase-anon-jwt',
        'x-discord-access-token': ' discord-oauth-token ',
      },
    });
    expect(discordAccessTokenFrom(req)).toBe('discord-oauth-token');
  });

  it('does not fall back to Authorization (anon JWT)', () => {
    const req = new Request('https://example.test', {
      headers: {authorization: 'Bearer supabase-anon-jwt'},
    });
    expect(discordAccessTokenFrom(req)).toBeNull();
  });

  it('returns null when header is blank', () => {
    const req = new Request('https://example.test', {
      headers: {'x-discord-access-token': '   '},
    });
    expect(discordAccessTokenFrom(req)).toBeNull();
  });
});

describe('isDiscordRateLimitError', () => {
  it('matches class and name fallback', () => {
    expect(isDiscordRateLimitError(new DiscordRateLimitError())).toBe(true);
    const renamed = new Error('DISCORD_RATE_LIMITED');
    renamed.name = 'DiscordRateLimitError';
    expect(isDiscordRateLimitError(renamed)).toBe(true);
    expect(isDiscordRateLimitError(new Error('other'))).toBe(false);
  });
});

describe('clientStatusForDiscordOAuthRefresh', () => {
  it('logs out only on Discord 400 invalid_grant', () => {
    expect(clientStatusForDiscordOAuthRefresh(400)).toBe(401);
    expect(clientStatusForDiscordOAuthRefresh(401)).toBe(503);
    expect(clientStatusForDiscordOAuthRefresh(429)).toBe(503);
    expect(clientStatusForDiscordOAuthRefresh(500)).toBe(503);
    expect(clientStatusForDiscordOAuthRefresh(0)).toBe(503);
  });
});

describe('verifyDiscordToken', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns null on Discord 401 (dead token)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('unauthorized', {status: 401})),
    );
    await expect(verifyDiscordToken('dead-token')).resolves.toBeNull();
  });

  it('throws DiscordRateLimitError on Discord 5xx (not expired)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('bad gateway', {status: 502})));
    await expect(verifyDiscordToken('blip-token')).rejects.toMatchObject({
      name: 'DiscordRateLimitError',
    });
  });
});

describe('requireDiscordUser / optionalDiscordUser', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns 401 when Discord token header is missing', async () => {
    const req = new Request('https://example.test', {
      headers: {authorization: 'Bearer supabase-anon-jwt'},
    });
    const required = await requireDiscordUser(req);
    expect(required).toBeInstanceOf(Response);
    expect((required as Response).status).toBe(401);
    await expect((required as Response).json()).resolves.toMatchObject({
      code: 'UNAUTHORIZED',
      error: 'Unauthorized',
    });

    const optional = await optionalDiscordUser(req);
    expect(optional).toBeNull();
  });

  it('optionalDiscordUser treats Discord 5xx as anonymous', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('bad gateway', {status: 502})));
    const req = new Request('https://example.test', {
      headers: {'x-discord-access-token': 'tok'},
    });
    await expect(optionalDiscordUser(req)).resolves.toBeNull();
  });

  it('requireDiscordUser returns 503 on Discord 5xx', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('bad gateway', {status: 502})));
    const req = new Request('https://example.test', {
      headers: {'x-discord-access-token': 'tok'},
    });
    const required = await requireDiscordUser(req);
    expect(required).toBeInstanceOf(Response);
    expect((required as Response).status).toBe(503);
  });
});
