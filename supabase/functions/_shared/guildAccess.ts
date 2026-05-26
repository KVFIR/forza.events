import {fetchUserGuilds, userCanManageGuild} from './discord.ts';

/** User OAuth guild list — member of guild. */
export async function userIsGuildMember(
  accessToken: string,
  guildId: string,
): Promise<boolean> {
  const guilds = await fetchUserGuilds(accessToken);
  return guilds.some((g) => g.id === guildId);
}

/** Canonical guild name from Discord (prevents spoofed discord_guilds labels). */
export async function resolveGuildNameForUser(
  accessToken: string,
  guildId: string,
): Promise<string | null> {
  const guilds = await fetchUserGuilds(accessToken);
  const match = guilds.find((g) => g.id === guildId);
  return match?.name ?? null;
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
