import {useEffect, useState} from 'react';
import {
  fetchParticipantResultsMap,
  type ParticipantEventResult,
} from '../lib/participantResults';

export function useParticipantResults(
  eventIds: string[],
  discordId: string | undefined,
): Map<string, ParticipantEventResult> {
  const [placements, setPlacements] = useState<Map<string, ParticipantEventResult>>(
    () => new Map(),
  );

  const idsKey = eventIds.join(',');

  useEffect(() => {
    if (!discordId || eventIds.length === 0) {
      setPlacements(new Map());
      return;
    }

    let cancelled = false;
    void fetchParticipantResultsMap(eventIds, discordId).then((map) => {
      if (!cancelled) setPlacements(map);
    });

    return () => {
      cancelled = true;
    };
  }, [idsKey, discordId]);

  return placements;
}
