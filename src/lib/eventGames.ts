import i18n from '../i18n';

export const FORZA_GAME_VALUES = ['fh5', 'fh6'] as const;

export type ForzaGame = (typeof FORZA_GAME_VALUES)[number];

export function isForzaGame(value: string | undefined | null): value is ForzaGame {
  return !!value && (FORZA_GAME_VALUES as readonly string[]).includes(value);
}

/** Coerce API/DB values; unknown → fh6 (legacy rows). */
export function normalizeEventGame(value: string | undefined | null): ForzaGame {
  return isForzaGame(value) ? value : 'fh6';
}

/** English short label — Discord embed / Rich Presence. */
export function eventGameLabelEn(game: ForzaGame): string {
  return game === 'fh5' ? 'FH5' : 'FH6';
}

/** Compact label for filter chips (FH5 / FH6). */
export function eventGameLabel(game: ForzaGame): string {
  return i18n.t(`eventGames.${normalizeEventGame(game)}`);
}

/** Full product name for badges + Create selector. */
export function eventGameLabelFull(game: ForzaGame): string {
  return i18n.t(`eventGames.${normalizeEventGame(game)}Full`);
}

export type EventGameOption = {
  value: ForzaGame;
  badge: {
    border: string;
    text: string;
    bg: string;
  };
  /** Stronger chip selected state for list filters. */
  chipSelected: string;
};

/**
 * FH5 = warm red, FH6 = cool fuchsia — deliberately far apart on the hue wheel.
 * Keep Badge / SegmentGroup / filter chips in sync.
 */
export const EVENT_GAMES: EventGameOption[] = [
  {
    value: 'fh5',
    badge: {
      border: 'border-red-500/20',
      text: 'text-red-300/80',
      bg: 'bg-red-500/[0.07]',
    },
    chipSelected: 'border-red-400/50 bg-red-600/25 text-red-100',
  },
  {
    value: 'fh6',
    badge: {
      border: 'border-fuchsia-500/20',
      text: 'text-fuchsia-300/80',
      bg: 'bg-fuchsia-500/[0.07]',
    },
    chipSelected: 'border-fuchsia-400/50 bg-fuchsia-600/25 text-fuchsia-100',
  },
];

export function eventGameMeta(game: string | undefined | null): EventGameOption {
  const g = normalizeEventGame(game);
  return EVENT_GAMES.find((o) => o.value === g) ?? EVENT_GAMES[1]!;
}
