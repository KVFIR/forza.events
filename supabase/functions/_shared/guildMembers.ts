import {botHeaders, discordRateLimitMessage} from './discord.ts';

export type GuildMemberSearchHit = {
  discord_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

type DiscordMemberSearchRow = {
  user?: {
    id: string;
    username: string;
    global_name?: string | null;
    avatar?: string | null;
  };
  nick?: string | null;
};

export function mapGuildMemberSearchRow(row: DiscordMemberSearchRow): GuildMemberSearchHit | null {
  const user = row.user;
  if (!user?.id) return null;
  const display = row.nick?.trim() || user.global_name?.trim() || user.username;
  const avatar = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
    : null;
  return {
    discord_id: user.id,
    username: user.username,
    display_name: display,
    avatar_url: avatar,
  };
}

/** Requires bot Server Members intent in the Discord Developer Portal. */
export async function searchGuildMembers(
  guildId: string,
  query: string,
): Promise<GuildMemberSearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const res = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/members/search?query=${
      encodeURIComponent(q)
    }&limit=25`,
    {headers: botHeaders()},
  );

  if (res.status === 403) {
    throw new Error(
      'Guild member search is unavailable. Enable the Server Members intent for the bot in the Discord Developer Portal.',
    );
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      discordRateLimitMessage(res.status) ??
        `Guild member search failed: ${res.status} ${text.slice(0, 120)}`,
    );
  }

  const rows = (await res.json()) as DiscordMemberSearchRow[];
  const hits: GuildMemberSearchHit[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const mapped = mapGuildMemberSearchRow(row);
    if (!mapped || seen.has(mapped.discord_id)) continue;
    seen.add(mapped.discord_id);
    hits.push(mapped);
  }
  return hits;
}
