import {digitsOnly, isCompleteShareCode, normalizeShareCode} from './shareCode';
import {VALIDATION_CODES, type ValidationCode} from './validationCodes';

/** UI / client model — keep fields aligned with `supabase/functions/_shared/eventTracks.ts`. */
export type EventTrack = {
  name: string;
  shareCode?: string | null;
  format?: string | null;
};

/** Persisted JSON row shape (snake_case). */
export type EventTrackRow = {
  name: string;
  share_code?: string | null;
  format?: string | null;
};

export const TRACK_NAME_MAX = 120;
export const TRACK_FORMAT_MAX = 100;
export const MAX_EVENT_TRACKS = 10;

export function emptyTrack(): EventTrack {
  return {name: '', shareCode: null, format: null};
}

export function normalizeTracks(input: EventTrack[]): EventTrack[] {
  return input
    .map((t) => ({
      name: t.name.trim().slice(0, TRACK_NAME_MAX),
      shareCode: normalizeShareCode(t.shareCode ?? '') ?? null,
      format: t.format?.trim().slice(0, TRACK_FORMAT_MAX) || null,
    }))
    .filter((t) => t.name || t.shareCode || t.format);
}

export function tracksToRows(tracks: EventTrack[]): EventTrackRow[] {
  return normalizeTracks(tracks).map((t) => ({
    name: t.name,
    share_code: t.shareCode,
    format: t.format,
  }));
}

export function parseTracksJson(tracks: unknown): EventTrack[] {
  if (!Array.isArray(tracks)) return [];
  const result: EventTrack[] = [];
  for (const item of tracks) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const name = typeof o.name === 'string' ? o.name.trim() : '';
    const rawCode =
      typeof o.share_code === 'string'
        ? o.share_code
        : typeof o.shareCode === 'string'
          ? o.shareCode
          : '';
    const shareCode = rawCode.trim() ? normalizeShareCode(rawCode) : null;
    const format = typeof o.format === 'string' && o.format.trim() ? o.format.trim() : null;
    if (!name && !shareCode && !format) continue;
    result.push({
      name: name.slice(0, TRACK_NAME_MAX),
      shareCode,
      format: format ? format.slice(0, TRACK_FORMAT_MAX) : null,
    });
  }
  return result;
}

export function migrateLegacyTracks(legacy?: {
  event_share_code?: string | null;
  track_codes?: string[] | null;
}): EventTrack[] {
  const codes = [legacy?.event_share_code, ...(legacy?.track_codes ?? [])]
    .map((c) => c?.trim())
    .filter((c): c is string => Boolean(c));
  return codes.map((code) => ({
    name: '',
    shareCode: normalizeShareCode(code) ?? code,
    format: null,
  }));
}

export function parseTracksFromRow(
  tracks: unknown,
  legacy?: {event_share_code?: string | null; track_codes?: string[] | null},
): EventTrack[] {
  const parsed = parseTracksJson(tracks);
  if (parsed.length > 0) return parsed;
  return migrateLegacyTracks(legacy);
}

export function shareCodeInputError(raw: string | null | undefined): ValidationCode | null {
  if (!raw?.trim()) return null;
  const d = digitsOnly(raw);
  if (d.length === 0) return null;
  if (!isCompleteShareCode(raw)) return VALIDATION_CODES.TRACK_SHARE_CODE_INVALID;
  return null;
}

export function validateTracks(tracks: EventTrack[]): ValidationCode | null {
  const normalized = normalizeTracks(tracks);
  if (normalized.length > MAX_EVENT_TRACKS) return VALIDATION_CODES.TRACKS_TOO_MANY;
  for (const t of tracks) {
    const codeErr = shareCodeInputError(t.shareCode ?? '');
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

/** Plain-text line for UI lists (not Discord markdown). */
export function formatTrackDisplayLine(track: EventTrack, fallbackName?: string): string {
  const name = track.name.trim() || fallbackName || '';
  const code = track.shareCode?.trim();
  const format = track.format?.trim();

  if (name) {
    const bits = [name];
    if (code) bits.push(code);
    let line = bits.join(' · ');
    if (format) line += ` — ${format}`;
    return line;
  }
  if (code) return format ? `${code} — ${format}` : code;
  return format ?? '';
}
