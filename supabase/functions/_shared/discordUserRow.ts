import {
  avatarUrl,
  discordUniqueUsername,
  isDiscordHandle,
  PLACEHOLDER_USER_USERNAME,
  type DiscordUser,
} from './discord.ts';
import type {adminClient} from './supabase.ts';

/** Ensure `users` row exists before `event_participants` FK insert. */
export async function ensureDiscordUserRow(
  supabase: ReturnType<typeof adminClient>,
  discordUser: DiscordUser,
): Promise<void> {
  const {error} = await supabase.from('users').upsert(
    {
      discord_id: discordUser.id,
      username: discordUniqueUsername(discordUser),
      discriminator: discordUser.discriminator ?? '',
      avatar_url: avatarUrl(discordUser),
    },
    {onConflict: 'discord_id'},
  );
  if (error) {
    throw new Error(`Failed to ensure user profile: ${error.message}`);
  }
}

/** Ensure `users` row exists before `events.lobby_leader_discord_id` FK insert. */
export async function ensureUserRowForDiscordId(
  supabase: ReturnType<typeof adminClient>,
  discordId: string,
  profile?: {username?: string | null; avatar_url?: string | null},
): Promise<void> {
  const handle = profile?.username?.trim();
  const {data: existing, error: loadErr} = await supabase
    .from('users')
    .select('discord_id, username, avatar_url')
    .eq('discord_id', discordId)
    .maybeSingle();
  if (loadErr) {
    throw new Error(`Failed to load user profile: ${loadErr.message}`);
  }

  if (existing) {
    const updates: Record<string, unknown> = {};
    if (handle && handle !== existing.username && !isDiscordHandle(existing.username)) {
      updates.username = handle;
    }
    if (profile?.avatar_url && !existing.avatar_url) {
      updates.avatar_url = profile.avatar_url;
    }
    if (Object.keys(updates).length === 0) return;
    const {error} = await supabase.from('users').update(updates).eq('discord_id', discordId);
    if (error) {
      throw new Error(`Failed to update user profile: ${error.message}`);
    }
    return;
  }

  const {error} = await supabase.from('users').insert({
    discord_id: discordId,
    username: handle || PLACEHOLDER_USER_USERNAME,
    discriminator: '',
    avatar_url: profile?.avatar_url ?? null,
  });
  if (error) {
    throw new Error(`Failed to ensure user profile: ${error.message}`);
  }
}

/** Resolve convoy leader handle: body → valid DB row → optional Bot API fetch. */
export async function resolveDiscordHandleForUserId(
  discordId: string,
  options: {
    bodyHandle?: string | null;
    existingUsername?: string | null;
    fetchById?: (id: string) => Promise<DiscordUser>;
  },
): Promise<string | null> {
  const fromBody = options.bodyHandle?.trim();
  if (fromBody && isDiscordHandle(fromBody)) return fromBody;

  const existing = options.existingUsername?.trim();
  if (existing && isDiscordHandle(existing)) return existing;

  if (options.fetchById) {
    const user = await options.fetchById(discordId);
    return discordUniqueUsername(user);
  }

  return null;
}
