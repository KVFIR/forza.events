import {botHeaders, discordApiFetch, discordRateLimitMessage} from './discord.ts';

const ADMINISTRATOR = 0x8n;
const CREATE_INSTANT_INVITE = 0x1n;
const VIEW_CHANNEL = 0x400n;
const SEND_MESSAGES = 0x800n;
const EMBED_LINKS = 0x4000n;
const ALL_PERMISSIONS = (1n << 52n) - 1n;
const POST_PERMISSIONS = VIEW_CHANNEL | SEND_MESSAGES | EMBED_LINKS | CREATE_INSTANT_INVITE;

/** Human-readable publish-channel permission list — keep in sync with i18n publish.noPostableChannelsHint / errors.botCannotPost. */
export const PUBLISH_CHANNEL_PERMISSIONS_LABEL =
  'View Channel, Send Messages, Embed Links, and Create Invite';

export const BOT_CANNOT_POST_MESSAGE =
  `FORZA.EVENTS cannot post in this channel. Allow ${PUBLISH_CHANNEL_PERMISSIONS_LABEL} for the bot (or its role) in channel settings.`;

export const LIST_CHANNELS_HINT_CODES = {
  NO_TEXT_CHANNELS: 'NO_TEXT_CHANNELS',
  NO_PERMITTED_CHANNELS: 'NO_PERMITTED_CHANNELS',
} as const;

export type ListChannelsHintCode =
  (typeof LIST_CHANNELS_HINT_CODES)[keyof typeof LIST_CHANNELS_HINT_CODES];

export type PermissionOverwrite = {
  id: string;
  type: number;
  allow: string;
  deny: string;
};

export type DiscordRole = {
  id: string;
  permissions: string;
  position: number;
};

export type DiscordMember = {
  user: {id: string};
  roles: string[];
};

export type DiscordTextChannel = {
  id: string;
  name: string;
  type: number;
  position: number;
  guild_id?: string;
  parent_id?: string | null;
  permission_overwrites?: PermissionOverwrite[];
};

/** Category + channel overwrites (Discord inheritance, root → leaf). */
export function mergedChannelOverwrites(
  channel: DiscordTextChannel,
  channelsById: Map<string, DiscordTextChannel>,
): PermissionOverwrite[] {
  const parents: DiscordTextChannel[] = [];
  let parentId = channel.parent_id ?? null;
  while (parentId) {
    const parent = channelsById.get(parentId);
    if (!parent) break;
    parents.unshift(parent);
    parentId = parent.parent_id ?? null;
  }
  const merged: PermissionOverwrite[] = [];
  for (const p of parents) {
    if (p.permission_overwrites?.length) merged.push(...p.permission_overwrites);
  }
  if (channel.permission_overwrites?.length) {
    merged.push(...channel.permission_overwrites);
  }
  return merged;
}

let cachedBotUserId: string | null = null;

function applyOverwrite(base: bigint, allow: bigint, deny: bigint): bigint {
  return (base & ~deny) | allow;
}

export function computeMemberChannelPermissions(
  guildId: string,
  member: DiscordMember,
  roles: DiscordRole[],
  overwrites: PermissionOverwrite[],
): bigint {
  const rolesById = new Map(roles.map((r) => [r.id, r]));
  const everyone = rolesById.get(guildId);
  let perms = everyone ? BigInt(everyone.permissions) : 0n;

  for (const roleId of member.roles) {
    const role = rolesById.get(roleId);
    if (role) perms |= BigInt(role.permissions);
  }

  if ((perms & ADMINISTRATOR) === ADMINISTRATOR) return ALL_PERMISSIONS;

  const memberRoleIds = new Set(member.roles);
  const sortedMemberRoles = roles
    .filter((r) => memberRoleIds.has(r.id))
    .sort((a, b) => b.position - a.position);

  const everyoneOw = overwrites.find((o) => o.type === 0 && o.id === guildId);
  if (everyoneOw) {
    perms = applyOverwrite(perms, BigInt(everyoneOw.allow), BigInt(everyoneOw.deny));
  }

  for (const role of sortedMemberRoles) {
    const ow = overwrites.find((o) => o.type === 0 && o.id === role.id);
    if (ow) perms = applyOverwrite(perms, BigInt(ow.allow), BigInt(ow.deny));
  }

  const memberOw = overwrites.find((o) => o.type === 1 && o.id === member.user.id);
  if (memberOw) perms = applyOverwrite(perms, BigInt(memberOw.allow), BigInt(memberOw.deny));

  return perms;
}

export function hasPostPermissions(perms: bigint): boolean {
  if ((perms & ADMINISTRATOR) === ADMINISTRATOR) return true;
  return (perms & POST_PERMISSIONS) === POST_PERMISSIONS;
}

export async function getBotUserId(): Promise<string> {
  if (cachedBotUserId) return cachedBotUserId;
  const res = await discordApiFetch('https://discord.com/api/v10/users/@me', {
    headers: botHeaders(),
  });
  if (!res.ok) {
    throw new Error(discordRateLimitMessage(res.status) ?? 'Failed to resolve bot user');
  }
  const user = (await res.json()) as {id: string};
  cachedBotUserId = user.id;
  return cachedBotUserId;
}

export async function fetchGuildChannels(guildId: string): Promise<DiscordTextChannel[]> {
  const res = await discordApiFetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
    headers: botHeaders(),
  });
  if (!res.ok) {
    throw new Error(
      discordRateLimitMessage(res.status) ?? `Failed to list guild channels: ${res.status}`,
    );
  }
  return (await res.json()) as DiscordTextChannel[];
}

export async function fetchGuildRoles(guildId: string): Promise<DiscordRole[]> {
  const res = await discordApiFetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
    headers: botHeaders(),
  });
  if (!res.ok) {
    throw new Error(
      discordRateLimitMessage(res.status) ?? `Failed to list guild roles: ${res.status}`,
    );
  }
  return (await res.json()) as DiscordRole[];
}

export async function fetchGuildMember(
  guildId: string,
  userId: string,
): Promise<DiscordMember | null> {
  const res = await discordApiFetch(
    `https://discord.com/api/v10/guilds/${guildId}/members/${userId}`,
    {headers: botHeaders()},
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(
      discordRateLimitMessage(res.status) ?? `Failed to fetch guild member: ${res.status}`,
    );
  }
  return (await res.json()) as DiscordMember;
}

export async function botCanPostInChannel(
  guildId: string,
  channel: Pick<DiscordTextChannel, 'permission_overwrites' | 'parent_id' | 'id'>,
  context?: {
    roles: DiscordRole[];
    member: DiscordMember;
    channelsById?: Map<string, DiscordTextChannel>;
  },
): Promise<boolean> {
  const roles = context?.roles ?? (await fetchGuildRoles(guildId));
  const member =
    context?.member ??
    (await fetchGuildMember(guildId, await getBotUserId()));
  if (!member) return false;
  const overwrites = context?.channelsById
    ? mergedChannelOverwrites(channel as DiscordTextChannel, context.channelsById)
    : (channel.permission_overwrites ?? []);
  const perms = computeMemberChannelPermissions(guildId, member, roles, overwrites);
  return hasPostPermissions(perms);
}
