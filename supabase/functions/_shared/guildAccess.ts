import {
  computeMemberChannelPermissions,
  fetchGuildMember,
  fetchGuildRoles,
} from './channelPermissions.ts';
import {
  type DiscordGuildSummary,
  fetchBotGuildIds,
  fetchUserGuilds,
  userCanManageGuild,
} from './discord.ts';

export const MANAGE_GUILD_REQUIRED =
  'You need Manage Server permission to choose publish channels.';

export function isDeniedManageGuildError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return msg === 'Forbidden' || msg === MANAGE_GUILD_REQUIRED;
}

export function memberRolesAllowManageGuild(
  guildId: string,
  member: {user: {id: string}; roles: string[]},
  roles: {id: string; permissions: string; position: number}[],
): boolean {
  const perms = computeMemberChannelPermissions(guildId, member, roles, []);
  return userCanManageGuild(String(perms));
}

export async function memberCanManageGuild(guildId: string, userId: string): Promise<boolean> {
  const member = await fetchGuildMember(guildId, userId);
  if (!member) return false;
  const roles = await fetchGuildRoles(guildId);
  return memberRolesAllowManageGuild(guildId, member, roles);
}

/**
 * OAuth `permissions` omit implicit owner bits and can strip Manage Server when
 * the guild requires 2FA. Recover those false negatives via bot member+roles
 * on servers where the bot is installed.
 */
export async function expandPublishGuildCandidates(
  userGuilds: DiscordGuildSummary[],
  userId: string,
): Promise<DiscordGuildSummary[]> {
  const cheap = userGuilds.filter((g) => userCanManageGuild(g.permissions, g.owner));
  const cheapIds = new Set(cheap.map((g) => g.id));
  const rest = userGuilds.filter((g) => !cheapIds.has(g.id));
  if (rest.length === 0) return cheap.length > 0 ? cheap : userGuilds;

  const botIds = await fetchBotGuildIds();
  const toVerify = rest.filter((g) => botIds.has(g.id));
  const verified: DiscordGuildSummary[] = [];
  // ponytail: serial lookups so list-guilds cannot stampede the bot global 429 bucket; cap-parallel if Target latency bites
  for (const g of toVerify) {
    try {
      if (await memberCanManageGuild(g.id, userId)) verified.push(g);
    } catch (e) {
      const detail = String(e);
      console.error(JSON.stringify({msg: 'manage-guild role check failed', guildId: g.id, detail}));
      if (detail.includes('rate limit')) break;
    }
  }

  const found = [...cheap, ...verified];
  return found.length > 0 ? found : userGuilds;
}

/** Single Discord guild list fetch for membership + Manage Server checks. */
export async function requireManageGuildAccess(
  accessToken: string,
  guildId: string,
  userId: string,
): Promise<DiscordGuildSummary> {
  const guilds = await fetchUserGuilds(accessToken);
  const guild = guilds.find((g) => g.id === guildId);
  if (!guild) {
    throw new Error('Forbidden');
  }
  if (userCanManageGuild(guild.permissions, guild.owner)) {
    return guild;
  }
  if (await memberCanManageGuild(guildId, userId)) return guild;
  throw new Error(MANAGE_GUILD_REQUIRED);
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
  userId: string,
): Promise<boolean> {
  const guilds = await fetchUserGuilds(accessToken);
  const guild = guilds.find((g) => g.id === guildId);
  if (!guild) return false;
  if (userCanManageGuild(guild.permissions, guild.owner)) return true;
  try {
    return await memberCanManageGuild(guildId, userId);
  } catch {
    return false;
  }
}
