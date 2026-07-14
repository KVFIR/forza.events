import {userCanManageGuild, type DiscordGuildSummary} from './discord.ts';

/** Guilds to intersect with bot install list — publish vs DM reachability. */
export function resolveListGuildCandidates(
  userGuilds: DiscordGuildSummary[],
  dmReachability: boolean,
): DiscordGuildSummary[] {
  if (dmReachability) return userGuilds;
  const manageable = userGuilds.filter((g) => userCanManageGuild(g.permissions));
  return manageable.length > 0 ? manageable : userGuilds;
}
