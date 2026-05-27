import {afterEach, describe, expect, it, vi} from 'vitest';
import {BOT_INSTALL_PERMISSIONS, buildBotInstallUrl} from './discordInstall';

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
