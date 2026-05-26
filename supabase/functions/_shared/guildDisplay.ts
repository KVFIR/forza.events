const PLACEHOLDER_GUILD_NAMES = new Set(['server', 'unknown server']);

export function normalizeGuildName(name?: string | null): string | null {
  const trimmed = name?.trim();
  if (!trimmed || PLACEHOLDER_GUILD_NAMES.has(trimmed.toLowerCase())) return null;
  return trimmed;
}
