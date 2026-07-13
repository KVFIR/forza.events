import type {CarPayload} from './eventSpec.ts';

type TrackRow = {name?: string; share_code?: string | null; format?: string | null};

export function normalizeTracksForDiff(tracks: unknown): string {
  const rows = Array.isArray(tracks) ? (tracks as TrackRow[]) : [];
  const normalized = rows.map((t) => ({
    name: (t.name ?? '').trim(),
    share_code: (t.share_code ?? '').trim(),
    format: (t.format ?? '').trim(),
  }));
  return JSON.stringify(normalized);
}

export function normalizeCarsForDiff(
  mode: string | null | undefined,
  maxPi: number | null | undefined,
  additionalRestrictions: string | null | undefined,
  cars: CarPayload[] | {car_id: string; max_pi: number; tune_share_code: string | null; car_restrictions: string[]}[],
): string {
  const payload = {
    mode: mode ?? 'anything_goes',
    max_pi: maxPi ?? null,
    additional: (additionalRestrictions ?? '').trim(),
    cars: [...cars]
      .map((c) => {
        if ('car_id' in c) {
          return {
            id: c.car_id,
            max_pi: c.max_pi,
            tune: (c.tune_share_code ?? '').trim(),
            restrictions: [...(c.car_restrictions ?? [])].sort(),
          };
        }
        return {
          id: c.id,
          max_pi: c.max_pi ?? null,
          tune: (c.tune_share_code ?? '').trim(),
          restrictions: [...(c.car_restrictions ?? [])].sort(),
        };
      })
      .sort((a, b) => String(a.id).localeCompare(String(b.id))),
  };
  return JSON.stringify(payload);
}

export function tracksOrCarsChanged(
  before: {tracks: unknown; carFingerprint: string},
  after: {tracks: unknown; carFingerprint: string},
): {tracks: boolean; cars: boolean} {
  return {
    tracks: normalizeTracksForDiff(before.tracks) !== normalizeTracksForDiff(after.tracks),
    cars: before.carFingerprint !== after.carFingerprint,
  };
}

export function eventUpdateContentHash(tracksChanged: boolean, carsChanged: boolean, tracks: unknown, carFingerprint: string): string {
  const parts = [
    tracksChanged ? normalizeTracksForDiff(tracks) : '',
    carsChanged ? carFingerprint : '',
  ];
  let hash = 0;
  const s = parts.join('|');
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) | 0;
  }
  return String(hash >>> 0);
}
