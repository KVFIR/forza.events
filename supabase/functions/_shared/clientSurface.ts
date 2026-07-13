export type ClientSurface = 'activity' | 'browser_web' | 'browser_blocked' | 'unknown';

const SURFACES = new Set<string>(['activity', 'browser_web', 'browser_blocked', 'unknown']);

export const CLIENT_SURFACE_HEADER = 'x-client-surface';

export function parseClientSurface(raw: string | null): ClientSurface {
  const value = raw?.trim().toLowerCase();
  if (value && SURFACES.has(value)) return value as ClientSurface;
  return 'unknown';
}
