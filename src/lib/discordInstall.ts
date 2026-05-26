import {getDiscordSdk, isStandaloneBrowser} from './discord';

/**
 * Bot permissions for guild install (publish embeds + read channels).
 * Send Messages | Embed Links | Read Message History | Use External Emojis
 */
export const BOT_INSTALL_PERMISSIONS = 346112;

/**
 * OAuth2 guild install — adds the app's bot user to a server (one step).
 * User-install in App Launcher does not satisfy list-guilds / publish.
 */
export function buildBotInstallUrl(options?: {guildId?: string}): string | null {
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID as string | undefined;
  if (!clientId?.trim()) return null;

  const params = new URLSearchParams({
    client_id: clientId.trim(),
    permissions: String(BOT_INSTALL_PERMISSIONS),
    scope: 'bot',
  });

  if (options?.guildId) {
    params.set('guild_id', options.guildId);
    params.set('disable_guild_select', 'true');
  }

  return `https://discord.com/api/oauth2/authorize?${params}`;
}

export async function openBotInstallUrl(options?: {guildId?: string}): Promise<boolean> {
  const url = buildBotInstallUrl(options);
  if (!url) return false;

  const sdk = getDiscordSdk();
  if (sdk && !isStandaloneBrowser()) {
    try {
      await sdk.commands.openExternalLink({url});
      return true;
    } catch {
      // Fall through to window.open (e.g. older SDK or blocked command).
    }
  }

  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}
