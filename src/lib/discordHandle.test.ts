import {describe, expect, it} from 'vitest';
import {formatDiscordHandle} from './discordHandle';

describe('formatDiscordHandle', () => {
  it('prefixes handle with @', () => {
    expect(formatDiscordHandle('racer_one')).toBe('@racer_one');
  });

  it('does not double-prefix', () => {
    expect(formatDiscordHandle('@racer_one')).toBe('@racer_one');
  });
});
