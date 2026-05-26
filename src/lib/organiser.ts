/** Display attribution for who presents the event (not permissions). */
export type OrganiserSource = {
  guildName?: string | null;
  hostUsername: string;
};

/** Discord server name when set; otherwise the creating host's display name. */
export function resolveOrganiserLabel(event: OrganiserSource): string {
  const guild = event.guildName?.trim();
  if (guild) return guild;
  const host = event.hostUsername.trim();
  return host || 'Host';
}

/** True when UI falls back to the individual host (no guild name on the event). */
export function isHostOrganiser(event: OrganiserSource): boolean {
  return !event.guildName?.trim();
}
