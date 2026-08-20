export const OPEN_EVENT_BUTTON_PREFIX = 'open_event:';
/** Welcome / app launcher button — opens the Activity with no event deep link. */
export const OPEN_APP_CUSTOM_ID = 'open_app';

export function openEventCustomId(eventId: string): string {
  return `${OPEN_EVENT_BUTTON_PREFIX}${eventId}`;
}

export function isOpenAppCustomId(customId: string | null | undefined): boolean {
  return customId === OPEN_APP_CUSTOM_ID;
}

export function eventIdFromOpenEventCustomId(
  customId: string | null | undefined,
): string | null {
  if (!customId?.startsWith(OPEN_EVENT_BUTTON_PREFIX)) return null;
  const id = customId.slice(OPEN_EVENT_BUTTON_PREFIX.length).trim().split(':')[0] ?? '';
  return id.length > 0 ? id : null;
}
