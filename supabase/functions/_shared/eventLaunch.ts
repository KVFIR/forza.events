export const OPEN_EVENT_BUTTON_PREFIX = 'open_event:';

export function openEventCustomId(eventId: string): string {
  return `${OPEN_EVENT_BUTTON_PREFIX}${eventId}`;
}

export function eventIdFromOpenEventCustomId(
  customId: string | null | undefined,
): string | null {
  if (!customId?.startsWith(OPEN_EVENT_BUTTON_PREFIX)) return null;
  const id = customId.slice(OPEN_EVENT_BUTTON_PREFIX.length).trim();
  return id.length > 0 ? id : null;
}
