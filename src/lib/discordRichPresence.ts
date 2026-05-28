import {LOBBY_TOTAL_PLAYERS} from './constants';
import {resolveEventCoverAbsolute} from './eventCovers';
import {
  eventHasStarted,
  isEventFinalized,
  resolveEventDisplayStatus,
} from './eventSpec';
import {eventTypeLabelEn, normalizeEventType} from './eventTypes';
import {getDiscordSdk, isStandaloneBrowser} from './discord';
import {
  getRichPresenceSessionStart,
  markRichPresencePayloadApplied,
  shouldApplyRichPresencePayload,
} from './discordRichPresenceSession';
import {isDiscordActivityFrame} from './supabaseEnv';
import type {EventStatus, ForzaEvent} from './types';

export {resetRichPresenceSession} from './discordRichPresenceSession';

/** RPC activity type: Competing — fits racing events better than Playing (0). */
export const RICH_PRESENCE_ACTIVITY_TYPE = 5;

const MAX_FIELD_LEN = 128;
const DEFAULT_APP_ORIGIN = 'https://forzaevents.up.railway.app';

/** Rich Presence copy is always English (visible to all friends). */
const RICH_PRESENCE_EN = {
  browsing: 'Looking for races',
  managingEvents: 'Managing my events',
  settingUpRace: 'Setting up a race',
  preparingDraft: 'Preparing a race (draft)',
  inApp: 'In FORZA.EVENTS',
  viewingEvent: 'Loading event…',
  raceResults: 'Race results',
  submittingResults: 'Submitting results',
  hosting: 'Hosting',
  registered: 'Registered',
  full: 'Lobby full',
  live: 'Race in progress',
  finished: 'Finished',
  cancelled: 'Cancelled',
} as const;

function rp(key: keyof typeof RICH_PRESENCE_EN): string {
  return RICH_PRESENCE_EN[key];
}

function rpOpen(typeLabel: string): string {
  return `${typeLabel} · open`;
}

export type RichPresenceActivity = {
  type: number;
  details?: string | null;
  state?: string | null;
  timestamps?: {start?: number; end?: number} | null;
  assets?: {
    large_image?: string | null;
    large_text?: string | null;
    small_image?: string | null;
    small_text?: string | null;
  } | null;
  party?: {id?: string | null; size?: [number, number] | null} | null;
};

export type EventRichPresenceRole = 'host' | 'joined' | 'viewing';

/** True when Rich Presence sync and setActivity should run. */
export function canSyncRichPresence(): boolean {
  return isDiscordActivityFrame() && !isStandaloneBrowser();
}

/** Canonical public origin for RP images (Discord fetches URLs server-side). */
export function richPresenceAssetOrigin(): string {
  const fromEnv = import.meta.env.VITE_APP_ORIGIN as string | undefined;
  const envOrigin = fromEnv?.trim().replace(/\/$/, '');
  if (envOrigin) return envOrigin;
  if (typeof window !== 'undefined') {
    return window.location.origin.replace(/\/$/, '');
  }
  return DEFAULT_APP_ORIGIN;
}

export function truncateRichPresenceField(value: string, max = MAX_FIELD_LEN): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function richPresenceLogoUrl(origin = richPresenceAssetOrigin()): string {
  return `${origin.replace(/\/$/, '')}/logo/logo.png`;
}

export function richPresenceEventCoverUrl(
  event: Pick<ForzaEvent, 'type' | 'coverImageUrl'>,
  origin = richPresenceAssetOrigin(),
): string {
  return resolveEventCoverAbsolute(
    normalizeEventType(event.type),
    event.coverImageUrl,
    origin,
  );
}

export function defaultRichPresenceAssets(
  origin = richPresenceAssetOrigin(),
): NonNullable<RichPresenceActivity['assets']> {
  return {
    large_image: richPresenceLogoUrl(origin),
  };
}

function withSessionTimestamp(activity: RichPresenceActivity): RichPresenceActivity {
  return {
    ...activity,
    timestamps: {start: getRichPresenceSessionStart()},
  };
}

function routeBase(origin = richPresenceAssetOrigin()): RichPresenceActivity {
  return {
    type: RICH_PRESENCE_ACTIVITY_TYPE,
    assets: defaultRichPresenceAssets(origin),
  };
}

export function buildRouteRichPresence(pathname: string): RichPresenceActivity {
  const base = routeBase();

  if (pathname === '/' || pathname === '') {
    return {
      ...base,
      details: rp('browsing'),
      state: 'FORZA.EVENTS',
    };
  }
  if (pathname === '/my-events') {
    return {
      ...base,
      details: rp('managingEvents'),
      state: 'FORZA.EVENTS',
    };
  }
  if (pathname === '/profile') {
    return {
      ...base,
      details: rp('inApp'),
      state: null,
    };
  }
  if (/^\/event\/[^/]+\/results\/?$/.test(pathname)) {
    return {
      ...base,
      details: rp('raceResults'),
      state: 'FORZA.EVENTS',
    };
  }
  if (/^\/event\/[^/]+\/?$/.test(pathname)) {
    return {
      ...base,
      details: rp('viewingEvent'),
      state: 'FORZA.EVENTS',
    };
  }

  return {
    ...base,
    details: rp('inApp'),
    state: null,
  };
}

export function buildCreateRichPresence(
  draftTitle: string | null | undefined,
  editing: boolean,
): RichPresenceActivity {
  const title = draftTitle?.trim();
  const base = routeBase();
  return withSessionTimestamp({
    ...base,
    details: title
      ? truncateRichPresenceField(title)
      : rp(editing ? 'preparingDraft' : 'settingUpRace'),
    state: title ? rp(editing ? 'preparingDraft' : 'settingUpRace') : 'FORZA.EVENTS',
  });
}

function eventRichPresenceAssets(
  event: Pick<ForzaEvent, 'type' | 'coverImageUrl'>,
  origin: string,
): NonNullable<RichPresenceActivity['assets']> {
  return {
    large_image: richPresenceEventCoverUrl(event, origin),
    small_image: richPresenceLogoUrl(origin),
  };
}

export function buildResultsRichPresence(event: ForzaEvent): RichPresenceActivity {
  const title = truncateRichPresenceField(event.title || 'Event');
  const origin = richPresenceAssetOrigin();
  return withSessionTimestamp({
    type: RICH_PRESENCE_ACTIVITY_TYPE,
    details: title,
    state: rp('submittingResults'),
    party: publishedPartySize(event),
    assets: eventRichPresenceAssets(event, origin),
  });
}

function publishedPartySize(
  event: Pick<ForzaEvent, 'currentPlayers' | 'maxPlayers' | 'discordMessageId'>,
): RichPresenceActivity['party'] {
  if (!event.discordMessageId?.trim()) return null;
  const max = event.maxPlayers > 0 ? event.maxPlayers : LOBBY_TOTAL_PLAYERS;
  return {size: [Math.max(0, event.currentPlayers), max]};
}

/** Exported for unit tests. */
export function eventPresenceState(
  event: ForzaEvent,
  role: EventRichPresenceRole,
  displayStatus: EventStatus,
): string {
  if (event.lifecycle === 'cancelled') return rp('cancelled');
  if (isEventFinalized(event)) return rp('finished');
  if (event.lifecycle === 'draft') {
    return role === 'host' ? rp('preparingDraft') : rp('viewingEvent');
  }

  if (role === 'host') return rp('hosting');
  if (role === 'joined') return rp('registered');

  if (displayStatus === 'full') return rp('full');
  if (displayStatus === 'live' || eventHasStarted(event)) return rp('live');

  return rpOpen(eventTypeLabelEn(event.type));
}

export function buildEventRichPresence(
  event: ForzaEvent,
  context: {
    role: EventRichPresenceRole;
    displayStatus?: EventStatus;
  },
): RichPresenceActivity {
  const displayStatus = context.displayStatus ?? resolveEventDisplayStatus(event);
  const origin = richPresenceAssetOrigin();
  const title = truncateRichPresenceField(event.title || 'Event');
  const state = truncateRichPresenceField(
    eventPresenceState(event, context.role, displayStatus),
  );

  return withSessionTimestamp({
    type: RICH_PRESENCE_ACTIVITY_TYPE,
    details: title,
    state,
    party: publishedPartySize(event),
    assets: eventRichPresenceAssets(event, origin),
  });
}

export function mergeRichPresence(
  route: RichPresenceActivity,
  override: RichPresenceActivity | null | undefined,
): RichPresenceActivity {
  if (!override) return withSessionTimestamp(route);
  return withSessionTimestamp({
    ...route,
    ...override,
    assets: override.assets ?? route.assets,
    timestamps: override.timestamps ?? route.timestamps,
    party: 'party' in override ? override.party : route.party,
  });
}

/** Push Rich Presence to Discord (no-op outside Activity iframe or without SDK). */
export async function applyDiscordRichPresence(
  activity: RichPresenceActivity,
): Promise<void> {
  if (!canSyncRichPresence()) return;

  const sdk = getDiscordSdk();
  if (!sdk) return;

  const next = withSessionTimestamp(activity);
  if (!shouldApplyRichPresencePayload(next)) return;

  try {
    await sdk.commands.setActivity({activity: next});
    markRichPresencePayloadApplied(next);
  } catch (err) {
    console.warn('Discord setActivity failed', err);
  }
}
