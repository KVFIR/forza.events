const PLACEHOLDER_GUILD_NAMES = new Set(['server', 'unknown server']);

/** True when the name is missing or a client/backend placeholder, not a real Discord guild name. */
export function isPlaceholderGuildName(name?: string | null): boolean {
  const trimmed = name?.trim();
  if (!trimmed) return true;
  return PLACEHOLDER_GUILD_NAMES.has(trimmed.toLowerCase());
}
