import {botHeaders} from './discord.ts';

const ADMINISTRATOR = 0x8n;
const VIEW_CHANNEL = 0x400n;
const SEND_MESSAGES = 0x800n;
const EMBED_LINKS = 0x4000n;
const ALL_PERMISSIONS = (1n << 52n) - 1n;
const POST_PERMISSIONS = VIEW_CHANNEL | SEND_MESSAGES | EMBED_LINKS;

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
  permission_overwrites?: PermissionOverwrite[];
};

export const BOT_CANNOT_POST_MESSAGE =
  'FORZA.EVENTS cannot post in this channel. Allow View Channel, Send Messages, and Embed Links for the bot (or its role) in channel settings.';

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
  const res = await fetch('https://discord.com/api/v10/users/@me', {headers: botHeaders()});
  if (!res.ok) throw new Error('Failed to resolve bot user');
  const user = (await res.json()) as {id: string};
  cachedBotUserId = user.id;
  return cachedBotUserId;
}

export async function fetchGuildRoles(guildId: string): Promise<DiscordRole[]> {
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
    headers: botHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to list guild roles: ${res.status}`);
  return (await res.json()) as DiscordRole[];
}

export async function fetchGuildMember(
  guildId: string,
  userId: string,
): Promise<DiscordMember | null> {
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
    headers: botHeaders(),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch guild member: ${res.status}`);
  return (await res.json()) as DiscordMember;
}

export async function botCanPostInChannel(
  guildId: string,
  channel: Pick<DiscordTextChannel, 'permission_overwrites'>,
  context?: {roles: DiscordRole[]; member: DiscordMember},
): Promise<boolean> {
  const roles = context?.roles ?? (await fetchGuildRoles(guildId));
  const member =
    context?.member ??
    (await fetchGuildMember(guildId, await getBotUserId()));
  if (!member) return false;
  const perms = computeMemberChannelPermissions(
    guildId,
    member,
    roles,
    channel.permission_overwrites ?? [],
  );
  return hasPostPermissions(perms);
}
