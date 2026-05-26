const PLACEHOLDER_GUILD_NAMES = new Set(['server', 'unknown server']);

/** True when the name is missing or a client/backend placeholder, not a real Discord guild name. */
export function isPlaceholderGuildName(name?: string | null): boolean {
  const trimmed = name?.trim();
  if (!trimmed) return true;
  return PLACEHOLDER_GUILD_NAMES.has(trimmed.toLowerCase());
}

/** Returns a guild name safe to persist or show; null if placeholder. */
export function normalizeGuildName(name?: string | null): string | null {
  const trimmed = name?.trim();
  if (!trimmed || isPlaceholderGuildName(trimmed)) return null;
  return trimmed;
}
