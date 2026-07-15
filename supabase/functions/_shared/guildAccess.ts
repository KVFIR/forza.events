import {
  type DiscordGuildSummary,
  fetchUserGuilds,
  userCanManageGuild,
} from './discord.ts';

/** Single Discord guild list fetch for membership + Manage Server checks. */
export async function requireManageGuildAccess(
  accessToken: string,
  guildId: string,
): Promise<DiscordGuildSummary> {
  const guilds = await fetchUserGuilds(accessToken);
  const guild = guilds.find((g) => g.id === guildId);
  if (!guild) {
    throw new Error('Forbidden');
  }
  if (!userCanManageGuild(guild.permissions)) {
    throw new Error('You need Manage Server permission to choose publish channels.');
  }
  return guild;
}

/** User OAuth guild list — member of guild. */
export async function userIsGuildMember(
  accessToken: string,
  guildId: string,
): Promise<boolean> {
  const guilds = await fetchUserGuilds(accessToken);
  return guilds.some((g) => g.id === guildId);
}

/** User OAuth guild row — membership + icon hash for catalog upsert. */
export async function resolveUserGuild(
  accessToken: string,
  guildId: string,
): Promise<DiscordGuildSummary | null> {
  const guilds = await fetchUserGuilds(accessToken);
  return guilds.find((g) => g.id === guildId) ?? null;
}

/** Canonical guild name from Discord (prevents spoofed discord_guilds labels). */
export async function resolveGuildNameForUser(
  accessToken: string,
  guildId: string,
): Promise<string | null> {
  const guild = await resolveUserGuild(accessToken, guildId);
  return guild?.name ?? null;
}

/** User may configure publish targets (Manage Guild or Administrator). */
export async function userCanManageGuildById(
  accessToken: string,
  guildId: string,
): Promise<boolean> {
  const guilds = await fetchUserGuilds(accessToken);
  const guild = guilds.find((g) => g.id === guildId);
  if (!guild) return false;
  return userCanManageGuild(guild.permissions);
}
