type TrackRow = {name?: string; share_code?: string | null; format?: string | null};

/** Catalog payload or DB `event_cars` row — kept local so client `@edge` import does not pull Deno `eventSpec`. */
type CarsDiffRow =
  | {id: string; max_pi?: number | null; tune_share_code?: string | null; car_restrictions?: string[]}
  | {car_id: string; max_pi: number; tune_share_code: string | null; car_restrictions: string[]};

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
  cars: CarsDiffRow[],
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
      .sort((a, b) => {
        const byId = String(a.id).localeCompare(String(b.id));
        if (byId !== 0) return byId;
        const byTune = a.tune.localeCompare(b.tune);
        if (byTune !== 0) return byTune;
        const byPi = (a.max_pi ?? 0) - (b.max_pi ?? 0);
        if (byPi !== 0) return byPi;
        return JSON.stringify(a.restrictions).localeCompare(JSON.stringify(b.restrictions));
      }),
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

export function startsAtMinuteEpoch(startsAt: string): number | null {
  const ms = new Date(startsAt).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.floor(ms / 60_000);
}

/** Compare schedule at minute precision (datetime-local / embed display granularity). */
export function scheduleChanged(beforeStartsAt: string, afterStartsAt: string): boolean {
  const before = startsAtMinuteEpoch(beforeStartsAt);
  const after = startsAtMinuteEpoch(afterStartsAt);
  if (before == null || after == null) return false;
  return before !== after;
}

export function eventUpdateContentHash(
  tracksChanged: boolean,
  carsChanged: boolean,
  scheduleChangedFlag: boolean,
  tracks: unknown,
  carFingerprint: string,
  startsAt?: string,
): string {
  const parts = [
    tracksChanged ? normalizeTracksForDiff(tracks) : '',
    carsChanged ? carFingerprint : '',
    scheduleChangedFlag ? String(startsAtMinuteEpoch(startsAt ?? '') ?? '') : '',
  ];
  let hash = 0;
  const s = parts.join('|');
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) | 0;
  }
  return String(hash >>> 0);
}
