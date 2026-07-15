import {describe, expect, it} from 'vitest';
import {buildGuildCatalogUpsert} from '@edge/guildCatalog.ts';
import {guildIconCdnUrl} from '@edge/discord.ts';

describe('guildIconCdnUrl', () => {
  it('builds png and gif CDN URLs', () => {
    expect(guildIconCdnUrl('123', 'abc')).toBe('https://cdn.discordapp.com/icons/123/abc.png');
    expect(guildIconCdnUrl('123', 'a_abc')).toBe('https://cdn.discordapp.com/icons/123/a_abc.gif');
    expect(guildIconCdnUrl('123', null)).toBeNull();
  });
});

describe('buildGuildCatalogUpsert', () => {
  it('omits icon_url when guild has no icon hash', () => {
    const row = buildGuildCatalogUpsert('g1', 'Server', {id: 'g1', name: 'Server', icon: null});
    expect(row).toEqual({guild_id: 'g1', guild_name: 'Server'});
  });

  it('merges invite into existing settings', () => {
    const row = buildGuildCatalogUpsert('g1', 'Server', null, {
      inviteUrl: 'https://discord.gg/test',
      existingSettings: {cleanup_hours: 2},
    });
    expect(row.settings).toEqual({
      cleanup_hours: 2,
      invite_url: 'https://discord.gg/test',
    });
  });
});
