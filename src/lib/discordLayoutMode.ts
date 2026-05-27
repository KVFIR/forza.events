/** Discord Embedded App SDK layout modes — https://docs.discord.com/developers/activities/development-guides/layout */
export const DiscordLayoutMode = {
  UNHANDLED: -1,
  FOCUSED: 0,
  PIP: 1,
  GRID: 2,
} as const;

export type DiscordLayoutModeValue =
  (typeof DiscordLayoutMode)[keyof typeof DiscordLayoutMode];

/** True when Discord reports picture-in-picture (`layout_mode === 1`). */
export function isPipLayoutMode(mode: DiscordLayoutModeValue): boolean {
  return mode === DiscordLayoutMode.PIP;
}

export function layoutModeFromUpdate(update: {layout_mode?: number}): DiscordLayoutModeValue {
  const raw = update.layout_mode;
  if (raw === DiscordLayoutMode.FOCUSED) return DiscordLayoutMode.FOCUSED;
  if (raw === DiscordLayoutMode.PIP) return DiscordLayoutMode.PIP;
  if (raw === DiscordLayoutMode.GRID) return DiscordLayoutMode.GRID;
  return DiscordLayoutMode.UNHANDLED;
}
