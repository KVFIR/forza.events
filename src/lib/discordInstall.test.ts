import {afterEach, describe, expect, it, vi} from 'vitest';
import {BOT_INSTALL_PERMISSIONS, buildBotInstallUrl, buildDiscordAppAddUrl} from './discordInstall';

describe('buildDiscordAppAddUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns null without client id', () => {
    vi.stubEnv('VITE_DISCORD_CLIENT_ID', '');
    expect(buildDiscordAppAddUrl()).toBeNull();
  });

  it('builds app add URL with client id only', () => {
    vi.stubEnv('VITE_DISCORD_CLIENT_ID', '1093188765851328563');
    expect(buildDiscordAppAddUrl()).toBe(
      'https://discord.com/oauth2/authorize?client_id=1093188765851328563',
    );
  });
});

describe('buildBotInstallUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns null without client id', () => {
    vi.stubEnv('VITE_DISCORD_CLIENT_ID', '');
    expect(buildBotInstallUrl()).toBeNull();
  });

  it('builds callback-less bot install URL', () => {
    vi.stubEnv('VITE_DISCORD_CLIENT_ID', '123456789');
    const url = buildBotInstallUrl();
    expect(url).toContain('https://discord.com/oauth2/authorize?');
    const params = new URL(url!).searchParams;
    expect(params.get('client_id')).toBe('123456789');
    expect(params.get('scope')).toBe('bot');
    expect(params.get('permissions')).toBe(String(BOT_INSTALL_PERMISSIONS));
    expect(BOT_INSTALL_PERMISSIONS & 1).toBe(1);
    expect(params.has('response_type')).toBe(false);
    expect(params.has('redirect_uri')).toBe(false);
  });

  it('pre-fills guild without locking the server picker', () => {
    vi.stubEnv('VITE_DISCORD_CLIENT_ID', '123456789');
    const url = buildBotInstallUrl({guildId: '987654321'});
    const params = new URL(url!).searchParams;
    expect(params.get('guild_id')).toBe('987654321');
    expect(params.has('disable_guild_select')).toBe(false);
  });
});
