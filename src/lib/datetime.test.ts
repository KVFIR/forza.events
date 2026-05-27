import {formatInTimeZone} from 'date-fns-tz';
import {describe, expect, it} from 'vitest';
import {dateFnsLocale} from '../i18n/dateLocale';
import {
  datetimeLocalInputBounds,
  defaultTimezone,
  formatEventTime,
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

  it('formatEventTime primary is in the viewer timezone', () => {
    const startsAt = '2030-06-15T12:00:00.000Z';
    const viewerTz = defaultTimezone();
    const locale = dateFnsLocale();
    const pattern = 'EEE d MMM, HH:mm';

    const {primary} = formatEventTime(startsAt, 'Pacific/Kiritimati');
    expect(primary).toBe(
      formatInTimeZone(new Date(startsAt), viewerTz, pattern, {locale}),
    );
  });

  it('formatEventTime secondary shows host timezone when it differs from viewer', () => {
    const viewerTz = defaultTimezone();
    const hostTz = viewerTz === 'UTC' ? 'Pacific/Auckland' : 'UTC';
    const {secondary} = formatEventTime('2030-06-15T12:00:00.000Z', hostTz);
    expect(secondary).not.toBe('');
  });

  it('formatEventTime omits secondary when host timezone matches viewer', () => {
    const viewerTz = defaultTimezone();
    const {secondary} = formatEventTime('2030-06-15T12:00:00.000Z', viewerTz);
    expect(secondary).toBe('');
  });
});
