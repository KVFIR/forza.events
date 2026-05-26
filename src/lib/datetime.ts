import {formatInTimeZone, fromZonedTime} from 'date-fns-tz';
import {format} from 'date-fns';
import i18n from '../i18n';
import {dateFnsLocale} from '../i18n/dateLocale';

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

  const locale = dateFnsLocale();
  const primary = formatInTimeZone(d, hint, 'EEE d MMM, HH:mm', {locale});
  const secondary =
    hint !== viewerTz
      ? i18n.t('common.yourTime', {
          time: formatInTimeZone(d, viewerTz, 'EEE d MMM, HH:mm', {locale}),
        })
      : `${i18n.t('common.todayAt')} ${format(d, 'HH:mm', {locale})}`;

  return {primary, secondary};
}
