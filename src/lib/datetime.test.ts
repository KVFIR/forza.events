import {formatInTimeZone} from 'date-fns-tz';
import {describe, expect, it} from 'vitest';
import {dateFnsLocale} from '../i18n/dateLocale';
import {
  datetimeLocalInputBounds,
  defaultTimezone,
  formatEventStart,
  formatEventStartsIn,
  localInputToUtc,
  normalizeDatetimeLocalInput,
  utcToLocalInput,
} from './datetime';

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

  it('clamps datetime-local year to 4 digits', () => {
    expect(normalizeDatetimeLocalInput('202627-05-27T18:30')).toBe('2026-05-27T18:30');
    expect(normalizeDatetimeLocalInput('2026-05-27T18:30')).toBe('2026-05-27T18:30');
    expect(normalizeDatetimeLocalInput('20262705271830')).toBe('2026');
  });

  it('datetime-local bounds use 4-digit years', () => {
    const {min, max} = datetimeLocalInputBounds();
    expect(min).toMatch(/^2000-/);
    expect(max).toMatch(/^2099-/);
  });

  it('formatEventStart uses the viewer timezone', () => {
    const startsAt = '2030-06-15T12:00:00.000Z';
    const viewerTz = defaultTimezone();
    const locale = dateFnsLocale();

    expect(formatEventStart(startsAt)).toBe(
      formatInTimeZone(new Date(startsAt), viewerTz, 'EEE d MMM, HH:mm', {locale}),
    );
  });

  it('formatEventStartsIn is null after start', () => {
    expect(formatEventStartsIn(new Date(Date.now() - 60_000).toISOString())).toBeNull();
  });

  it('formatEventStartsIn describes a future start', () => {
    const label = formatEventStartsIn(new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString());
    expect(label && label.length > 0).toBe(true);
  });
});
