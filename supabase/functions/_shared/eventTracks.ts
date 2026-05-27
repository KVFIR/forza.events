import {digitsOnly, isCompleteShareCode, normalizeShareCode} from './shareCode.ts';
import {VALIDATION_CODES, type ValidationCode} from './validationCodes.ts';

export type EventTrackRow = {
  name: string;
  share_code?: string | null;
  format?: string | null;
};

export const TRACK_NAME_MAX = 120;
export const TRACK_FORMAT_MAX = 100;
export const MAX_EVENT_TRACKS = 10;

export function normalizeTrackRows(input: EventTrackRow[]): EventTrackRow[] {
  return input
    .map((t) => ({
      name: String(t.name ?? '').trim().slice(0, TRACK_NAME_MAX),
      share_code: normalizeShareCode(String(t.share_code ?? '')) ?? null,
      format: String(t.format ?? '').trim().slice(0, TRACK_FORMAT_MAX) || null,
    }))
    .filter((t) => t.name || t.share_code || t.format);
}

export function parseTracksJson(tracks: unknown): EventTrackRow[] {
  if (!Array.isArray(tracks)) return [];
  const result: EventTrackRow[] = [];
  for (const item of tracks) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const name = typeof o.name === 'string' ? o.name.trim() : '';
    const rawCode = typeof o.share_code === 'string' ? o.share_code : '';
    const share_code = rawCode.trim() ? normalizeShareCode(rawCode) : null;
    const format = typeof o.format === 'string' && o.format.trim() ? o.format.trim() : null;
    if (!name && !share_code && !format) continue;
    result.push({
      name: name.slice(0, TRACK_NAME_MAX),
      share_code,
      format: format ? format.slice(0, TRACK_FORMAT_MAX) : null,
    });
  }
  return result;
}

export function migrateLegacyTrackRows(legacy?: {
  event_share_code?: string | null;
  track_codes?: string[] | null;
}): EventTrackRow[] {
  const codes = [legacy?.event_share_code, ...(legacy?.track_codes ?? [])]
    .map((c) => c?.trim())
    .filter((c): c is string => Boolean(c));
  return codes.map((code) => ({
    name: '',
    share_code: normalizeShareCode(code) ?? code,
    format: null,
  }));
}

export function resolveTrackRows(
  tracks: unknown,
  legacy?: {event_share_code?: string | null; track_codes?: string[] | null},
): EventTrackRow[] {
  const parsed = parseTracksJson(tracks);
  if (parsed.length > 0) return parsed;
  return migrateLegacyTrackRows(legacy);
}

function shareCodeInputError(raw: string | null | undefined): ValidationCode | null {
  if (!raw?.trim()) return null;
  const d = digitsOnly(raw);
  if (d.length === 0) return null;
  if (!isCompleteShareCode(raw)) return VALIDATION_CODES.TRACK_SHARE_CODE_INVALID;
  return null;
}

export function validateTrackRows(rows: EventTrackRow[]): ValidationCode | null {
  const normalized = normalizeTrackRows(rows);
  if (normalized.length > MAX_EVENT_TRACKS) return VALIDATION_CODES.TRACKS_TOO_MANY;
  for (const t of rows) {
    const codeErr = shareCodeInputError(t.share_code ?? '');
    if (codeErr) return codeErr;
  }
  for (const t of normalized) {
    if (!t.name) return VALIDATION_CODES.TRACK_NAME_REQUIRED;
    if (t.format && t.format.length > TRACK_FORMAT_MAX) {
      return VALIDATION_CODES.TRACK_FORMAT_TOO_LONG;
    }
  }
  return null;
}

/** Discord embed line — share code in inline backticks when present. */
export function formatTrackEmbedLine(
  track: EventTrackRow,
  inlineCode: (text: string) => string,
): string {
  const name = track.name?.trim() ?? '';
  const code = track.share_code?.trim();
  const format = track.format?.trim();

  if (name) {
    const bits = [name];
    if (code) bits.push(inlineCode(code));
    let line = bits.join(' · ');
    if (format) line += ` — ${format}`;
    return line;
  }
  if (code) {
    const coded = inlineCode(code);
    return format ? `${coded} — ${format}` : coded;
  }
  return format ?? '';
}
