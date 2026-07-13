import type {CarRuleMode, EventTrack} from './types';

export type PublishedNotifyCar = {
  id: string;
  maxPi: number;
  tuneShareCode?: string;
  restrictions: string[];
};

export type PublishedNotifyBaseline = {
  tracks: EventTrack[];
  carRuleMode: CarRuleMode;
  maxPi: number;
  additionalCarRestrictions: string;
  cars: PublishedNotifyCar[];
};

function normalizeTracks(tracks: EventTrack[]): string {
  const normalized = tracks.map((t) => ({
    name: (t.name ?? '').trim(),
    shareCode: (t.shareCode ?? '').trim(),
    format: (t.format ?? '').trim(),
  }));
  return JSON.stringify(normalized);
}

function normalizeCars(
  mode: CarRuleMode,
  maxPi: number,
  additional: string,
  cars: PublishedNotifyCar[],
): string {
  return JSON.stringify({
    mode,
    max_pi: maxPi,
    additional: additional.trim(),
    cars: [...cars]
      .map((c) => ({
        id: c.id,
        max_pi: c.maxPi,
        tune: (c.tuneShareCode ?? '').trim(),
        restrictions: [...c.restrictions].sort(),
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  });
}

/** True when saving a published event would enqueue racer track/car update DMs. */
export function publishedTracksOrCarsChanged(
  current: PublishedNotifyBaseline,
  baseline: PublishedNotifyBaseline | null,
): boolean {
  if (!baseline) return false;
  if (normalizeTracks(current.tracks) !== normalizeTracks(baseline.tracks)) return true;
  return normalizeCars(
    current.carRuleMode,
    current.maxPi,
    current.additionalCarRestrictions,
    current.cars,
  ) !== normalizeCars(
    baseline.carRuleMode,
    baseline.maxPi,
    baseline.additionalCarRestrictions,
    baseline.cars,
  );
}
