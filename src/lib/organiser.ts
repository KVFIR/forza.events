import {formatDiscordHandle} from './discordHandle';
import {isPlaceholderGuildName} from './guildDisplay';

/** Display attribution for who presents the event (not permissions). */
export type OrganiserSource = {
  guildName?: string | null;
  hostUsername: string;
};

/** Discord server name when set; otherwise the creating host's Discord handle. */
export function resolveOrganiserLabel(event: OrganiserSource): string {
  const guild = event.guildName?.trim();
  if (guild && !isPlaceholderGuildName(guild)) return guild;
  const host = formatDiscordHandle(event.hostUsername);
  return host || 'Host';
}
