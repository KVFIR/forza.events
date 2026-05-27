/** Discord Embedded App SDK layout modes — https://docs.discord.com/developers/activities/development-guides/layout */
export const DiscordLayoutMode = {
  UNHANDLED: -1,
  FOCUSED: 0,
  PIP: 1,
  GRID: 2,
} as const;

export type DiscordLayoutModeValue =
  (typeof DiscordLayoutMode)[keyof typeof DiscordLayoutMode];

export function isCompactLayoutMode(mode: DiscordLayoutModeValue): boolean {
  return mode === DiscordLayoutMode.PIP || mode === DiscordLayoutMode.GRID;
}

/** Heuristic when SDK layout events are unavailable (dev browser resize). */
export function isCompactViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 420 || window.innerHeight <= 300;
}

export function layoutModeFromUpdate(update: {layout_mode?: number}): DiscordLayoutModeValue {
  const raw = update.layout_mode;
  if (raw === DiscordLayoutMode.FOCUSED) return DiscordLayoutMode.FOCUSED;
  if (raw === DiscordLayoutMode.PIP) return DiscordLayoutMode.PIP;
  if (raw === DiscordLayoutMode.GRID) return DiscordLayoutMode.GRID;
  return DiscordLayoutMode.UNHANDLED;
}
