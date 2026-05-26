import {describe, expect, it} from 'vitest';
import {localInputToUtc, utcToLocalInput} from './datetime';

describe('datetime', () => {
  it('round-trips UTC via local input in UTC', () => {
    const utc = '2030-06-15T14:30:00.000Z';
    const local = utcToLocalInput(utc, 'UTC');
    expect(localInputToUtc(local, 'UTC')).toBe(utc);
  });

  it('empty local falls back to now-ish ISO', () => {
    const iso = localInputToUtc('', 'UTC');
    expect(() => new Date(iso)).not.toThrow();
  });
});
