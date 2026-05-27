/** Discord ids allowed in event_results — keep in sync with resolveResultsRoster in src/lib/eventRoster.ts */

type EventRow = {
  host_discord_id: string;
  lobby_leader_is_host: boolean | null;
  lobby_leader_discord_id: string | null;
};

type ParticipantRow = {
  discord_id: string;
};

export function allowedResultDiscordIds(
  event: EventRow,
  participants: ParticipantRow[],
): Set<string> {
  const ids = new Set(participants.map((p) => String(p.discord_id)));

  if (event.lobby_leader_discord_id) {
    ids.add(String(event.lobby_leader_discord_id));
  } else if (event.lobby_leader_is_host !== false) {
    ids.add(String(event.host_discord_id));
  }

  return ids;
}
