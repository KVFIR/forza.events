/** Mutable Rich Presence session state — isolated to avoid import cycles with discord.ts */

let sessionStartUnix: number | null = null;
let lastPayloadKey = '';

export function getRichPresenceSessionStart(): number {
  if (sessionStartUnix == null) {
    sessionStartUnix = Math.floor(Date.now() / 1000);
  }
  return sessionStartUnix;
}

export function richPresencePayloadKey(activity: unknown): string {
  return JSON.stringify(activity);
}

/** True when payload differs from the last successful setActivity (safe to attempt RPC). */
export function shouldApplyRichPresencePayload(activity: unknown): boolean {
  return richPresencePayloadKey(activity) !== lastPayloadKey;
}

/** Call only after setActivity succeeds — failed RPC leaves dedup open for retry. */
export function markRichPresencePayloadApplied(activity: unknown): void {
  lastPayloadKey = richPresencePayloadKey(activity);
}

/** Reset session timer and RPC de-duplication (call on Activity re-auth). */
export function resetRichPresenceSession(): void {
  sessionStartUnix = null;
  lastPayloadKey = '';
}
