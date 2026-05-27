import type {ForzaEvent} from './types';

/** Optimistic event row after the current user leaves (before refetch). */
export function patchEventAfterSelfLeave(event: ForzaEvent, discordId: string): ForzaEvent {
  if (!discordId || !event.participants.some((p) => p.discordId === discordId)) {
    return event;
  }
  return {
    ...event,
    participants: event.participants.filter((p) => p.discordId !== discordId),
    currentPlayers: Math.max(0, event.currentPlayers - 1),
  };
}
