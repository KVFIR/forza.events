const PLACEHOLDER_GUILD_NAMES = new Set(['server', 'unknown server']);

const DISCORD_LINK_HOSTS = new Set([
  'discord.gg',
  'discord.com',
  'www.discord.com',
  'discordapp.com',
  'www.discordapp.com',
]);

export function isDiscordLinkUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'https:' && DISCORD_LINK_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function normalizeGuildName(name?: string | null): string | null {
  const trimmed = name?.trim();
  if (!trimmed || PLACEHOLDER_GUILD_NAMES.has(trimmed.toLowerCase())) return null;
  return trimmed;
}
