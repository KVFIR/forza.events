import {formatDistanceToNowStrict} from 'date-fns';
import {formatInTimeZone, fromZonedTime} from 'date-fns-tz';
import {dateFnsLocale} from '../i18n/dateLocale';

export function defaultTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

const DATETIME_LOCAL_RE =
  /^(\d+)(-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?)/;

/** `<input type="datetime-local" />` allows 5–6 digit years while typing — clamp to 4. */
export function normalizeDatetimeLocalInput(value: string): string {
  if (!value) return '';
  const match = value.match(DATETIME_LOCAL_RE);
  if (!match) {
    const digits = value.replace(/\D/g, '');
    return digits.length > 4 ? digits.slice(0, 4) : value;
  }
  const [, year, rest] = match;
  if (year.length <= 4) return value;
  return `${year.slice(0, 4)}${rest}`;
}

/** Bounds for create-event datetime picker (4-digit years). */
export function datetimeLocalInputBounds(): {min: string; max: string} {
  return {min: '2000-01-01T00:00', max: '2099-12-31T23:59'};
}

/** UTC ISO → value for `<input type="datetime-local" />` in the given timezone */
export function utcToLocalInput(isoUtc: string, timezone = defaultTimezone()): string {
  return formatInTimeZone(new Date(isoUtc), timezone, "yyyy-MM-dd'T'HH:mm");
}

/** Convert datetime-local value in the user's timezone → UTC ISO string */
export function localInputToUtc(isoLocal: string, timezone = defaultTimezone()): string {
  if (!isoLocal) return new Date().toISOString();
  return fromZonedTime(isoLocal, timezone).toISOString();
}

/** Event start time in the viewer's local timezone. */
export function formatEventStart(startsAt: string): string {
  const locale = dateFnsLocale();
  return formatInTimeZone(new Date(startsAt), defaultTimezone(), 'EEE d MMM, HH:mm', {
    locale,
  });
}

/** Relative wait until start; null once the start time has passed. */
export function formatEventStartsIn(startsAt: string): string | null {
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime()) || start.getTime() <= Date.now()) return null;
  return formatDistanceToNowStrict(start, {locale: dateFnsLocale(), addSuffix: true});
}
