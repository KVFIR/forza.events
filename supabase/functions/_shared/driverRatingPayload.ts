/** Shared driver rating payload for user-profile / leaderboard. */

import {isProvisional} from './rating.ts';

export type DriverRatingPayload = {
  rating: number;
  gamesRated: number;
  provisional: boolean;
};

type RatingRow = {rating?: number | null; games_rated?: number | null};

/** Null until the first ranked result is applied (`games_rated` ≥ 1). */
export function driverRatingFromRow(
  row: RatingRow | null | undefined,
): DriverRatingPayload | null {
  const gamesRated = row?.games_rated ?? 0;
  if (!row || gamesRated < 1 || row.rating == null) return null;
  return {
    rating: row.rating,
    gamesRated,
    provisional: isProvisional(gamesRated),
  };
}

/** PostgREST 1:1 embed is an object; some nests still arrive as a one-row array. */
export function nestedRatingNumber(raw: unknown): number | undefined {
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row || typeof row !== 'object') return undefined;
  return driverRatingFromRow(row as RatingRow)?.rating;
}
