import {formatInTimeZone, fromZonedTime} from 'date-fns-tz';
import {format} from 'date-fns';

export function defaultTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
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

export function formatEventTime(
  startsAt: string,
  timezoneHint?: string,
): {primary: string; secondary: string} {
  const d = new Date(startsAt);
  const viewerTz = defaultTimezone();
  const hint = timezoneHint ?? viewerTz;

  const primary = formatInTimeZone(d, hint, 'EEE d MMM, HH:mm');
  const secondary =
    hint !== viewerTz
      ? `Your time: ${formatInTimeZone(d, viewerTz, 'EEE d MMM, HH:mm')}`
      : format(d, "'Today at' HH:mm");

  return {primary, secondary};
}
