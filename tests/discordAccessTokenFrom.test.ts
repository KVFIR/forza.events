import {describe, expect, it} from 'vitest';
import {
  DiscordRateLimitError,
  discordAccessTokenFrom,
  isDiscordRateLimitError,
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

describe('requireDiscordUser / optionalDiscordUser', () => {
  it('returns 401 when Discord token header is missing', async () => {
    const req = new Request('https://example.test', {
      headers: {authorization: 'Bearer supabase-anon-jwt'},
    });
    const required = await requireDiscordUser(req);
    expect(required).toBeInstanceOf(Response);
    expect((required as Response).status).toBe(401);

    const optional = await optionalDiscordUser(req);
    expect(optional).toBeNull();
  });
});
