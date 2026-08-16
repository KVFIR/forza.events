import {describe, expect, it} from 'vitest';
import {resolveOrganiserGuildName, resolveOrganiserLabel} from './organiser';

describe('resolveOrganiserLabel', () => {
  it('uses guild name when set', () => {
    expect(
      resolveOrganiserLabel({guildName: 'Forza Club', hostUsername: 'host_user'}),
    ).toBe('Forza Club');
  });

  it('formats host Discord handle when guild is absent', () => {
    expect(resolveOrganiserLabel({hostUsername: 'host_user'})).toBe('@host_user');
  });

  it('ignores placeholder guild names', () => {
    expect(resolveOrganiserGuildName({guildName: 'Server', hostUsername: 'host_user'})).toBeNull();
    expect(resolveOrganiserLabel({guildName: 'Server', hostUsername: 'host_user'})).toBe(
      '@host_user',
    );
  });
});
