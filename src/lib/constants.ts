/** Registered driver slots (convoy leader is separate, not counted). */
export const EVENT_PLAYER_SLOTS = 11;

/** Total in-game lobby size including convoy leader. */
export const LOBBY_TOTAL_PLAYERS = 12;

/** e.g. "9/12" — convoy leader (always) + registered drivers. */
export function formatLobbyCount(registered: number, total = LOBBY_TOTAL_PLAYERS): string {
  return `${1 + registered}/${total}`;
}
