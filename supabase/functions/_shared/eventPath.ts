/** UUID v1–v5 (events.id). Slugs are `title-YYYYMMDD` and never match this. */
export const EVENT_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isEventUuid(value: string): boolean {
  return EVENT_UUID_RE.test(value);
}

export function eventUrlKey(event: {id: string; slug?: string | null}): string {
  return event.slug?.trim() || event.id;
}

export function eventDetailPath(
  event: {id: string; slug?: string | null},
  options?: {results?: boolean},
): string {
  return `/event/${eventUrlKey(event)}${options?.results ? '/results' : ''}`;
}

export function eventMatchesRouteKey(
  event: {id: string; slug?: string | null},
  routeKey: string,
): boolean {
  return event.id === routeKey || event.slug === routeKey;
}
