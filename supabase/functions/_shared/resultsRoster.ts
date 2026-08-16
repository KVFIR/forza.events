/** Discord ids already on the racing roster (not waitlisted). Submit-results also allows guild guests. */

type ParticipantRow = {
  discord_id: string;
  waitlisted?: boolean | null;
};

export function allowedResultDiscordIds(participants: ParticipantRow[]): Set<string> {
  return new Set(
    participants
      .filter((p) => !p.waitlisted)
      .map((p) => String(p.discord_id)),
  );
}
