import {formatDiscordHandle} from './discordHandle';
import {isPlaceholderGuildName} from './guildDisplay';

/** Display attribution for who presents the event (not permissions). */
export type OrganiserSource = {
  guildName?: string | null;
  hostUsername: string;
};

/** Guild name when it carries the attribution; null when we fall back to the host. */
export function resolveOrganiserGuildName(event: OrganiserSource): string | null {
  const guild = event.guildName?.trim();
  return guild && !isPlaceholderGuildName(guild) ? guild : null;
}

/** Discord server name when set; otherwise the creating host's Discord handle. */
export function resolveOrganiserLabel(event: OrganiserSource): string {
  const guild = resolveOrganiserGuildName(event);
  if (guild) return guild;
  const host = formatDiscordHandle(event.hostUsername);
  return host || 'Host';
}
