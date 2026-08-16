import {describe, expect, it} from 'vitest';
import {
  GUILD_TEXT,
  GUILD_VOICE,
  hasPostPermissions,
  listVisibleVoiceChannels,
  voiceChannelTargetError,
} from '@edge/channelPermissions.ts';

describe('hasPostPermissions', () => {
  it('requires Create Invite in addition to post permissions', () => {
    const postOnly = 0x400n | 0x800n | 0x4000n;
    const withInvite = postOnly | 0x1n;
    expect(hasPostPermissions(postOnly)).toBe(false);
    expect(hasPostPermissions(withInvite)).toBe(true);
  });
});

describe('listVisibleVoiceChannels', () => {
  it('keeps guild voice channels and drops text', () => {
    expect(
      listVisibleVoiceChannels([
        {id: 't', name: 'chat', type: GUILD_TEXT, position: 0},
        {id: 'v2', name: 'lobby-2', type: GUILD_VOICE, position: 2},
        {id: 'v1', name: 'lobby-1', type: GUILD_VOICE, position: 1},
        {id: 'stage', name: 'stage', type: 13, position: 0},
      ]),
    ).toEqual([
      {id: 'v1', name: 'lobby-1', position: 1},
      {id: 'v2', name: 'lobby-2', position: 2},
    ]);
  });
});

describe('voiceChannelTargetError', () => {
  it('rejects missing, wrong guild, and non-voice channels', () => {
    expect(voiceChannelTargetError(null, 'g1')).toBe('CHANNEL_NOT_FOUND');
    expect(
      voiceChannelTargetError({type: GUILD_VOICE, guild_id: 'g2'}, 'g1'),
    ).toBe('CHANNEL_WRONG_GUILD');
    expect(
      voiceChannelTargetError({type: GUILD_TEXT, guild_id: 'g1'}, 'g1'),
    ).toBe('CHANNEL_NOT_VOICE');
    expect(
      voiceChannelTargetError({type: GUILD_VOICE, guild_id: 'g1'}, 'g1'),
    ).toBeNull();
    expect(voiceChannelTargetError({type: GUILD_VOICE}, 'g1')).toBe(
      'CHANNEL_WRONG_GUILD',
    );
  });
});
