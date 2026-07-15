const PLACEHOLDER_GUILD_NAMES = new Set(['server', 'unknown server']);

const DISCORD_LINK_HOSTS = new Set([
  'discord.gg',
  'discord.com',
  'www.discord.com',
  'discordapp.com',
  'www.discordapp.com',
]);

/** https Discord invite / OAuth hosts only — used before opening external links. */
export function isDiscordLinkUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'https:' && DISCORD_LINK_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/** Invite URL cached on publish in discord_guilds.settings.invite_url. */
export function parseGuildInviteUrl(settings: unknown): string | undefined {
  if (!settings || typeof settings !== 'object') return undefined;
  const url = (settings as Record<string, unknown>).invite_url;
  if (typeof url !== 'string') return undefined;
  const trimmed = url.trim();
  if (!trimmed || !isDiscordLinkUrl(trimmed)) return undefined;
  return trimmed;
}

/** True when the name is missing or a client/backend placeholder, not a real Discord guild name. */
export function isPlaceholderGuildName(name?: string | null): boolean {
  const trimmed = name?.trim();
  if (!trimmed) return true;
  return PLACEHOLDER_GUILD_NAMES.has(trimmed.toLowerCase());
}
