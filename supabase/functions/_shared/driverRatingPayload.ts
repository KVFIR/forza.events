/** Shared driver rating payload for user-profile / leaderboard. */

import {isProvisional} from './rating.ts';

export type DriverRatingPayload = {
  rating: number;
  gamesRated: number;
  provisional: boolean;
};

/** Null until the first ranked result is applied (`games_rated` ≥ 1). */
export function driverRatingFromRow(
  row: {rating?: number | null; games_rated?: number | null} | null | undefined,
): DriverRatingPayload | null {
  const gamesRated = row?.games_rated ?? 0;
  if (!row || gamesRated < 1 || row.rating == null) return null;
  return {
    rating: row.rating,
    gamesRated,
    provisional: isProvisional(gamesRated),
  };
}
