import {getDiscordSdk, isStandaloneBrowser} from './discord';
import {isDiscordLinkUrl} from './guildDisplay';

/** Discord permission bits requested on bot OAuth install. */
const VIEW_CHANNEL = 1 << 10;
const SEND_MESSAGES = 1 << 11;
const EMBED_LINKS = 1 << 14;
const READ_MESSAGE_HISTORY = 1 << 16;
const USE_EXTERNAL_EMOJIS = 1 << 18;
const CREATE_INSTANT_INVITE = 1 << 0;

/**
 * Bot permissions for guild install (publish embeds + Join server invite on publish channel).
 * View Channel | Send Messages | Embed Links | Read Message History | Use External Emojis | Create Invite
 */
export const BOT_INSTALL_PERMISSIONS =
  VIEW_CHANNEL |
  SEND_MESSAGES |
  EMBED_LINKS |
  READ_MESSAGE_HISTORY |
  USE_EXTERNAL_EMOJIS |
  CREATE_INSTANT_INVITE;

/**
 * OAuth2 guild install — adds the app's bot user to a server (one step).
 * Uses the callback-less bot flow (no `response_type` / `redirect_uri`) so install
 * completes in the browser Discord opens from the Activity. Our app never exchanges
 * that code on `/bot-installed`.
 *
 * In Discord Developer Portal → Bot, keep **Requires OAuth2 Code Grant** disabled.
 */
/** OAuth URL to add the Discord app (Activity) — shown on the browser-only gate. */
export function buildDiscordAppAddUrl(): string | null {
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID as string | undefined;
  if (!clientId?.trim()) return null;

  const params = new URLSearchParams({client_id: clientId.trim()});
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export function buildBotInstallUrl(options?: {guildId?: string}): string | null {
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID as string | undefined;
  if (!clientId?.trim()) return null;

  const params = new URLSearchParams({
    client_id: clientId.trim(),
    permissions: String(BOT_INSTALL_PERMISSIONS),
    scope: 'bot',
  });

  // Pre-select the Activity server when known; do not disable the guild picker — the host
  // may need to install the bot on a different server they manage.
  if (options?.guildId) {
    params.set('guild_id', options.guildId);
  }

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export async function openBotInstallUrl(options?: {guildId?: string}): Promise<boolean> {
  const url = buildBotInstallUrl(options);
  if (!url) return false;
  return openExternalUrl(url);
}

export async function openExternalUrl(url: string): Promise<boolean> {
  const trimmed = url.trim();
  if (!trimmed || !isDiscordLinkUrl(trimmed)) return false;

  const sdk = getDiscordSdk();
  if (sdk && !isStandaloneBrowser()) {
    try {
      await sdk.commands.openExternalLink({url: trimmed});
      return true;
    } catch {
      // Fall through to window.open (e.g. older SDK or blocked command).
    }
  }

  window.open(trimmed, '_blank', 'noopener,noreferrer');
  return true;
}
