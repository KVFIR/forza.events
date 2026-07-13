import type {CarRuleMode, EventTrack} from './types';

export type PublishedNotifyCar = {
  id: string;
  maxPi: number;
  tuneShareCode?: string;
  restrictions: string[];
};

export type PublishedNotifyBaseline = {
  startsAt: string;
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

function startsAtMinuteEpoch(startsAt: string): number | null {
  const ms = new Date(startsAt).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.floor(ms / 60_000);
}

/** Keep in sync with `supabase/functions/_shared/notificationDiff.ts` (`scheduleChanged`). */
function scheduleChanged(currentStartsAt: string, baselineStartsAt: string): boolean {
  const before = startsAtMinuteEpoch(baselineStartsAt);
  const after = startsAtMinuteEpoch(currentStartsAt);
  if (before == null || after == null) return false;
  return before !== after;
}

/** True when saving a published event would enqueue racer update DMs. */
export function publishedNotifyFieldsChanged(
  current: PublishedNotifyBaseline,
  baseline: PublishedNotifyBaseline | null,
): boolean {
  if (!baseline) return false;
  if (scheduleChanged(current.startsAt, baseline.startsAt)) return true;
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

/** @deprecated Use publishedNotifyFieldsChanged */
export const publishedTracksOrCarsChanged = publishedNotifyFieldsChanged;
