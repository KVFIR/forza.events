/** Total racers in the lobby (convoy leader is a participant row). */
export const EVENT_PLAYER_SLOTS = 12;

/** @deprecated Use EVENT_PLAYER_SLOTS — kept for display labels that mention 12. */
export const LOBBY_TOTAL_PLAYERS = 12;

/** e.g. "9/12" — active participant rows. */
export function formatLobbyCount(currentPlayers: number, total = LOBBY_TOTAL_PLAYERS): string {
  return `${Math.max(0, currentPlayers)}/${total}`;
}
