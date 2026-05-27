import {avatarUrl, type DiscordUser} from './discord.ts';
import type {adminClient} from './supabase.ts';

/** Ensure `users` row exists before `event_participants` FK insert. */
export async function ensureDiscordUserRow(
  supabase: ReturnType<typeof adminClient>,
  discordUser: DiscordUser,
): Promise<void> {
  const displayName = discordUser.global_name ?? discordUser.username;
  const {error} = await supabase.from('users').upsert(
    {
      discord_id: discordUser.id,
      username: displayName,
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
  const username = profile?.username?.trim() || 'Driver';
  const {error} = await supabase.from('users').upsert(
    {
      discord_id: discordId,
      username,
      discriminator: '',
      avatar_url: profile?.avatar_url ?? null,
    },
    {onConflict: 'discord_id'},
  );
  if (error) {
    throw new Error(`Failed to ensure convoy leader profile: ${error.message}`);
  }
}
