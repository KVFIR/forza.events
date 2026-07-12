import {describe, expect, it} from 'vitest';
import {allowedResultDiscordIds} from '@edge/resultsRoster.ts';

describe('allowedResultDiscordIds', () => {
  it('excludes waitlisted racers', () => {
    const ids = allowedResultDiscordIds([
      {discord_id: 'a1', waitlisted: false},
      {discord_id: 'w1', waitlisted: true},
    ]);
    expect([...ids]).toEqual(['a1']);
  });
});
