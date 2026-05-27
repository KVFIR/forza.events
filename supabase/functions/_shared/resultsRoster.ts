/** Discord ids allowed in event_results — keep in sync with resolveResultsRoster in src/lib/eventRoster.ts */

type ParticipantRow = {
  discord_id: string;
};

export function allowedResultDiscordIds(participants: ParticipantRow[]): Set<string> {
  return new Set(participants.map((p) => String(p.discord_id)));
}
