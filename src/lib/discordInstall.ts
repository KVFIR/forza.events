import {getDiscordSdk, isStandaloneBrowser} from './discord';
import {isLocalDevHost} from './runtime';

/**
 * Bot permissions for guild install (publish embeds + read channels).
 * Send Messages | Embed Links | Read Message History | Use External Emojis
 */
export const BOT_INSTALL_PERMISSIONS = 346112;

/**
 * Redirect after guild bot OAuth (required when "Requires OAuth2 Code Grant" is on).
 * Must be listed under Discord → OAuth2 → Redirects.
 */
export function getBotInstallRedirectUri(): string {
  const explicit = import.meta.env.VITE_BOT_INSTALL_REDIRECT_URI as string | undefined;
  if (explicit?.trim()) return explicit.trim();

  const appOrigin = import.meta.env.VITE_APP_ORIGIN as string | undefined;
  if (appOrigin?.trim()) {
    return `${appOrigin.trim().replace(/\/$/, '')}/bot-installed`;
  }

  const authRedirect = import.meta.env.VITE_DISCORD_REDIRECT_URI as string | undefined;
  if (authRedirect?.trim()) {
    try {
      const u = new URL(authRedirect.trim());
      return `${u.origin}/bot-installed`;
    } catch {
      // ignore invalid URL
    }
  }

  if (typeof window !== 'undefined' && isLocalDevHost()) {
    return `${window.location.origin}/bot-installed`;
  }

  return '';
}

/**
 * OAuth2 guild install — adds the app's bot user to a server (one step).
 * User-install in App Launcher does not satisfy list-guilds / publish.
 */
export function buildBotInstallUrl(options?: {guildId?: string}): string | null {
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID as string | undefined;
  if (!clientId?.trim()) return null;

  const redirectUri = getBotInstallRedirectUri();
  if (!redirectUri) return null;

  const params = new URLSearchParams({
    client_id: clientId.trim(),
    permissions: String(BOT_INSTALL_PERMISSIONS),
    scope: 'bot',
    response_type: 'code',
    redirect_uri: redirectUri,
  });

  if (options?.guildId) {
    params.set('guild_id', options.guildId);
    params.set('disable_guild_select', 'true');
  }

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
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
