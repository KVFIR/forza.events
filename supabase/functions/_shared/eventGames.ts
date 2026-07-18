export const FORZA_GAME_VALUES = ['fh5', 'fh6'] as const;

export type ForzaGame = (typeof FORZA_GAME_VALUES)[number];

export function isForzaGame(value: string | undefined | null): value is ForzaGame {
  return !!value && (FORZA_GAME_VALUES as readonly string[]).includes(value);
}

/** Coerce API/DB values; unknown → fh6 (legacy rows). */
export function normalizeEventGame(value: string | undefined | null): ForzaGame {
  return isForzaGame(value) ? value : 'fh6';
}

/** English short label — Discord embed. */
export function eventGameLabelEn(game: ForzaGame): string {
  return game === 'fh5' ? 'FH5' : 'FH6';
}

export function isValidEventGame(value: string | undefined | null): value is ForzaGame {
  return isForzaGame(value);
}
