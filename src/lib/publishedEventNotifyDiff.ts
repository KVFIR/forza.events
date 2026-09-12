import {
  normalizeCarsForDiff,
  normalizeTracksForDiff,
  scheduleChanged,
} from '@edge/notificationDiff.ts';
import {tracksToRows} from './eventTracks';
import type {CarRuleMode, EventTrack} from './types';

export type PublishedNotifyCar = {
  /** Catalog `cars.id` — not `event_cars.id` (row ids change on every save). */
  carId: string;
  maxPi: number;
  tuneShareCode?: string;
  restrictions: string[];
};

export type PublishedNotifyBaseline = {
  startsAt: string;
  tracks: EventTrack[];
  carRuleMode: CarRuleMode;
  maxPi: number | null;
  additionalCarRestrictions: string;
  cars: PublishedNotifyCar[];
};

function carsForDiff(cars: PublishedNotifyCar[]) {
  return cars.map((c) => ({
    car_id: c.carId,
    max_pi: c.maxPi,
    tune_share_code: c.tuneShareCode ?? null,
    car_restrictions: c.restrictions,
  }));
}

function carFingerprint(input: PublishedNotifyBaseline): string {
  return normalizeCarsForDiff(
    input.carRuleMode,
    input.maxPi,
    input.additionalCarRestrictions,
    carsForDiff(input.cars),
  );
}

/** True when saving a published event would enqueue racer update DMs. */
export function publishedNotifyFieldsChanged(
  current: PublishedNotifyBaseline,
  baseline: PublishedNotifyBaseline | null,
): boolean {
  if (!baseline) return false;
  if (scheduleChanged(current.startsAt, baseline.startsAt)) return true;
  if (normalizeTracksForDiff(tracksToRows(current.tracks)) !== normalizeTracksForDiff(tracksToRows(baseline.tracks))) {
    return true;
  }
  return carFingerprint(current) !== carFingerprint(baseline);
}

/** @deprecated Use publishedNotifyFieldsChanged */
export const publishedTracksOrCarsChanged = publishedNotifyFieldsChanged;
