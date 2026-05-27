import {describe, expect, it} from 'vitest';
import {discordAvatarUrl} from '../src/lib/discordAvatar';

describe('discordAvatarUrl', () => {
  it('builds custom avatar URL with size', () => {
    expect(
      discordAvatarUrl({id: '123', avatar: 'abc123', discriminator: '0'}, 64),
    ).toBe('https://cdn.discordapp.com/avatars/123/abc123.png?size=64');
  });

  it('uses gif for animated avatars', () => {
    expect(discordAvatarUrl({id: '123', avatar: 'a_abc123'})).toContain('.gif');
  });

  it('uses default embed avatar when no custom avatar', () => {
    expect(discordAvatarUrl({id: '123', avatar: null})).toMatch(
      /embed\/avatars\/\d\.png$/,
    );
  });

  it('uses legacy discriminator for default index', () => {
    expect(discordAvatarUrl({id: '123', avatar: null, discriminator: '7'})).toBe(
      'https://cdn.discordapp.com/embed/avatars/2.png',
    );
  });
});
