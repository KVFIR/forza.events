import {formatCarEmbedName} from './carDisplay.ts';
import {eventHasStarted} from './eventSpec.ts';
import {resolveCoverAbsolute} from './eventCovers.ts';
import {openEventCustomId} from './eventLaunch.ts';
import {eventTypeEmbedColor} from './eventTypes.ts';
import type {CarRuleMode} from './eventSpec.ts';
import {formatTrackEmbedLine, resolveTrackRows} from './eventTracks.ts';
import {formatMaxPi} from './pi.ts';

const DEFAULT_APP_ORIGIN = 'https://forza.events';

const LOBBY_TOTAL_PLAYERS = 12;
const EMBED_FIELD_VALUE_MAX = 1024;
const EMBED_FIELD_NAME_MAX = 256;
const EMBED_TITLE_MAX = 256;
const EMBED_TOTAL_CHAR_MAX = 6000;
const EMBED_FIELDS_MAX = 25;
const EMBED_DESCRIPTION_MAX = 300;

const OPEN_IN_APP_HINT = 'open in FORZA.EVENTS for the full list';

export type EmbedAllowedCar = {
  make: string;
  model: string;
  year: number | null;
  max_pi: number;
  tune_share_code: string | null;
  car_restrictions: string[];
};

export type EmbedEventInput = {
  id: string;
  title: string;
  type: string;
  status?: string;
  starts_at: string;
  max_players: number;
  current_players: number;
  max_pi?: number | null;
  car_rule_mode?: CarRuleMode | null;
  tracks?: unknown;
  /** @deprecated — use `tracks` */
  event_share_code?: string | null;
  /** @deprecated — use `tracks` */
  track_codes?: string[] | null;
  rules_allowed?: string[] | null;
  additional_car_restrictions?: string | null;
  lobby_leader_gamertag: string;
  cover_image_url?: string | null;
  description?: string | null;
  guild_name?: string | null;
  allowed_cars?: EmbedAllowedCar[];
  /** Number of active lobbies (1..5); `max_players` is the capacity per group. */
  group_count?: number | null;
  /** Per-group summary (leader + active count); populated by enrichEmbedEvent. */
  groups?: EmbedGroupSummary[];
  /** Racers waiting because every active group is full. */
  waitlist_count?: number | null;
};

export type EmbedGroupSummary = {
  group_index: number;
  leader_gamertag: string | null;
  count: number;
};

type EventCarJoinRow = {
  max_pi: number;
  tune_share_code: string | null;
  car_restrictions: string[] | null;
  cars:
    | {make: string; model: string; year: number | null}
    | {make: string; model: string; year: number | null}[]
    | null;
};

export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `${base}-${date}`;
}

export function mapEventCarsForEmbed(eventCars: EventCarJoinRow[]): EmbedAllowedCar[] {
  const mapped: EmbedAllowedCar[] = [];
  for (const ec of eventCars ?? []) {
    const raw = ec.cars;
    const car = Array.isArray(raw) ? raw[0] : raw;
    if (!car) continue;
    mapped.push({
      make: car.make,
      model: car.model,
      year: car.year,
      max_pi: ec.max_pi,
      tune_share_code: ec.tune_share_code,
      car_restrictions: ec.car_restrictions ?? [],
    });
  }
  return mapped;
}

export function eventDetailUrl(eventId: string, origin: string): string {
  const base = origin.trim().replace(/\/$/, '');
  return `${base}/event/${eventId}`;
}

function discordTimestamp(iso: string, style: 'F' | 'R' = 'F'): string {
  const unix = Math.floor(new Date(iso).getTime() / 1000);
  if (!Number.isFinite(unix)) return iso;
  return `<t:${unix}:${style}>`;
}

function formatLobbyCount(currentPlayers: number, maxPlayers = LOBBY_TOTAL_PLAYERS): string {
  const filled = Math.max(0, currentPlayers);
  return `${filled}/${maxPlayers || LOBBY_TOTAL_PLAYERS}`;
}

function truncateFieldValue(value: string, max = EMBED_FIELD_VALUE_MAX): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function embedFieldName(label: string, part?: string): string {
  const name = part ? `${label} (${part})` : label;
  return name.length <= EMBED_FIELD_NAME_MAX ? name : name.slice(0, EMBED_FIELD_NAME_MAX);
}

function measureEmbedChars(parts: {
  title: string;
  description?: string;
  fields: {name: string; value: string}[];
}): number {
  let n = parts.title.length;
  if (parts.description) n += parts.description.length;
  for (const f of parts.fields) {
    n += f.name.length + f.value.length;
  }
  return n;
}

function omittedSuffix(count: number, noun: string): string {
  return `\n_+${count} more ${noun}(s) — ${OPEN_IN_APP_HINT}._`;
}

/** Discord inline code (`…`) for share codes, PI, tunes, and rule tags. */
function inlineCode(text: string): string {
  const flat = text.trim().replace(/\s+/g, ' ');
  if (!flat) return '';
  return `\`${flat.replace(/`/g, "'")}\``;
}

function listEventTracks(event: EmbedEventInput) {
  return resolveTrackRows(event.tracks, {
    event_share_code: event.event_share_code,
    track_codes: event.track_codes,
  });
}

function formatTrackFieldLines(tracks: ReturnType<typeof listEventTracks>): string {
  if (tracks.length === 0) return '';

  if (tracks.length === 1) {
    return truncateFieldValue(formatTrackEmbedLine(tracks[0], inlineCode));
  }

  let result = '';
  for (let i = 0; i < tracks.length; i++) {
    const line = `${i + 1}. ${formatTrackEmbedLine(tracks[i], inlineCode)}`;
    const next = result ? `${result}\n${line}` : line;
    const remaining = tracks.length - i - 1;
    if (remaining > 0 && next.length + omittedSuffix(remaining, 'track').length > EMBED_FIELD_VALUE_MAX) {
      return truncateFieldValue(`${result}${omittedSuffix(remaining, 'track')}`);
    }
    result = next;
  }
  return truncateFieldValue(result);
}

function resolveOpenBuildNotes(event: EmbedEventInput): string | null {
  const text =
    event.additional_car_restrictions ??
    (event.rules_allowed ?? [])
      .find((rule) => rule.startsWith('additional:'))
      ?.slice('additional:'.length);
  return text?.trim() || null;
}

function formatCarName(car: EmbedAllowedCar): string {
  return formatCarEmbedName({
    make: car.make,
    model: car.model,
    year: car.year,
  });
}

function formatRestrictedCarBlock(car: EmbedAllowedCar): string {
  const coded: string[] = [inlineCode(formatMaxPi(car.max_pi))];
  if (car.tune_share_code?.trim()) {
    coded.push(inlineCode(car.tune_share_code));
  }
  const hasTuningRules = (car.car_restrictions ?? []).some((rule) => rule?.trim());
  if (hasTuningRules) {
    coded.push(inlineCode('extra rules'));
  }
  return [formatCarName(car), ...coded].join(' ');
}

function splitOversizedBlock(block: string, max = EMBED_FIELD_VALUE_MAX): string[] {
  if (block.length <= max) return [block];
  const parts: string[] = [];
  let rest = block;
  while (rest.length > max) {
    parts.push(`${rest.slice(0, max - 1)}…`);
    rest = rest.slice(max - 1);
  }
  if (rest) parts.push(rest);
  return parts;
}

/** One car per line within the embed field value. */
function chunkCarFieldValues(blocks: string[], max = EMBED_FIELD_VALUE_MAX): string[] {
  const normalized = blocks.flatMap((block) => splitOversizedBlock(block, max));
  const chunks: string[] = [];
  let current = '';
  for (const block of normalized) {
    const piece = current ? `\n${block}` : block;
    if (current.length + piece.length > max && current) {
      chunks.push(truncateFieldValue(current, max));
      current = block;
    } else {
      current += piece;
    }
  }
  if (current) chunks.push(truncateFieldValue(current, max));
  return chunks.length > 0 ? chunks : ['Restricted car list (no cars configured)'];
}

type EmbedField = {name: string; value: string; inline: false};

function fitRestrictedCarFields(
  cars: EmbedAllowedCar[],
  limits: {maxChars: number; maxFields: number},
): {fields: EmbedField[]; shown: number} {
  if (cars.length === 0) {
    return {
      fields: [{name: embedFieldName('🚗 Car rules'), value: 'Restricted car list (no cars configured)', inline: false}],
      shown: 0,
    };
  }

  for (let count = cars.length; count >= 1; count--) {
    const omitted = cars.length - count;
    const blocks = cars.slice(0, count).map(formatRestrictedCarBlock);
    let values = chunkCarFieldValues(blocks);

    if (omitted > 0) {
      const suffix = omittedSuffix(omitted, 'car');
      const last = values.length - 1;
      const withSuffix = `${values[last]}${suffix}`;
      if (withSuffix.length > EMBED_FIELD_VALUE_MAX) continue;
      values[last] = withSuffix;
    }

    const fields: EmbedField[] = values.map((value, i) => ({
      name: embedFieldName('🚗 Car rules', values.length > 1 ? `${i + 1}/${values.length}` : undefined),
      value,
      inline: false,
    }));

    const usedChars = fields.reduce((sum, f) => sum + f.name.length + f.value.length, 0);
    if (fields.length <= limits.maxFields && usedChars <= limits.maxChars) {
      return {fields, shown: count};
    }
  }

  return {
    fields: [
      {
        name: embedFieldName('🚗 Car rules'),
        value: truncateFieldValue(
          `${cars.length} cars on the restricted list — ${OPEN_IN_APP_HINT}.`,
        ),
        inline: false,
      },
    ],
    shown: 0,
  };
}

function formatOpenBuildCarField(event: EmbedEventInput): string {
  const pi = event.max_pi ? formatMaxPi(event.max_pi) : 'PI cap';
  const label = `Open build ${inlineCode(pi)}`;
  const notes = resolveOpenBuildNotes(event);
  return notes ? `${label} ${inlineCode(notes)}` : label;
}


function waitlistEmbedField(count: number): EmbedField {
  return {
    name: embedFieldName('⏳ Waitlist'),
    value: truncateFieldValue(count === 1 ? '1 racer waiting' : `${count} racers waiting`),
    inline: false,
  };
}

/** One participants field per active group (leader + n/max); a single field when ungrouped. */
function buildParticipantsFields(event: EmbedEventInput): EmbedField[] {
  const maxPlayers = event.max_players || LOBBY_TOTAL_PLAYERS;
  const groupCount = event.group_count ?? 1;
  const groups = event.groups ?? [];
  const waitlist = event.waitlist_count ?? 0;

  if (groupCount <= 1 || groups.length <= 1) {
    const leader =
      groups[0]?.leader_gamertag?.trim() || event.lobby_leader_gamertag.trim() || 'TBD';
    const fields: EmbedField[] = [
      {
        name: embedFieldName(`👤 Participants (${formatLobbyCount(event.current_players, maxPlayers)})`),
        value: truncateFieldValue(`Convoy leader: ${leader}`),
        inline: false,
      },
    ];
    if (waitlist > 0) fields.push(waitlistEmbedField(waitlist));
    return fields;
  }

  // ponytail: 3+ groups share one field to stay under Discord's 25-field embed cap with cars/tracks.
  if (groups.length >= 3) {
    const lines = groups.map(
      (g) =>
        `Group ${g.group_index}: ${g.leader_gamertag?.trim() || 'TBD'} (${formatLobbyCount(g.count, maxPlayers)})`,
    );
    const fields: EmbedField[] = [
      {
        name: embedFieldName(
          `👤 Groups (${formatLobbyCount(event.current_players, maxPlayers * groupCount)})`,
        ),
        value: truncateFieldValue(lines.join('\n')),
        inline: false,
      },
    ];
    if (waitlist > 0) fields.push(waitlistEmbedField(waitlist));
    return fields;
  }

  const fields: EmbedField[] = groups.map((g) => ({
    name: embedFieldName(`👤 Group ${g.group_index} (${formatLobbyCount(g.count, maxPlayers)})`),
    value: truncateFieldValue(`Convoy leader: ${g.leader_gamertag?.trim() || 'TBD'}`),
    inline: false,
  }));
  if (waitlist > 0) fields.push(waitlistEmbedField(waitlist));
  return fields;
}

const EMBED_STATUS_COLORS: Record<string, number> = {
  cancelled: 0x6b7280,
  completed: 0x374151,
  archived: 0x374151,
};

type EmbedLifecycleUi = {
  /** Short status line shown in the embed description (subtitle). */
  statusSubtitle: string;
  /** Optional detail paragraph under the status line in the description. */
  statusDetail: string | null;
  color: number;
  buttonLabel: string;
  buttonDisabled: boolean;
  buttonStyle: 1 | 2 | 3 | 4;
};

function buildEmbedDescription(
  statusSubtitle: string,
  statusDetail: string | null,
): string | undefined {
  const parts: string[] = [];
  const subtitle = statusSubtitle.trim();
  if (subtitle) parts.push(subtitle);
  const detail = statusDetail?.trim();
  if (detail) parts.push(detail);
  if (!parts.length) return undefined;
  return parts.join('\n\n').slice(0, EMBED_DESCRIPTION_MAX);
}

function resolveEmbedLifecycleUi(
  status: string | undefined,
  startsAt: string,
  defaultColor: number,
): EmbedLifecycleUi {
  switch (status) {
    case 'cancelled':
      return {
        statusSubtitle: '🚫 CANCELLED',
        statusDetail: 'This event was **cancelled** by the host. Registration is closed.',
        color: EMBED_STATUS_COLORS.cancelled,
        buttonLabel: 'Event cancelled',
        buttonDisabled: true,
        buttonStyle: 2,
      };
    case 'completed':
      return {
        statusSubtitle: '✅ COMPLETED',
        statusDetail: 'Results are in — open **FORZA.EVENTS** for standings.',
        color: EMBED_STATUS_COLORS.completed,
        buttonLabel: 'View in FORZA.EVENTS',
        buttonDisabled: false,
        buttonStyle: 1,
      };
    case 'archived':
      return {
        statusSubtitle: '📦 ARCHIVED',
        statusDetail: 'This event is archived.',
        color: EMBED_STATUS_COLORS.archived,
        buttonLabel: 'View in FORZA.EVENTS',
        buttonDisabled: false,
        buttonStyle: 1,
      };
    default:
      if (eventHasStarted({status: status ?? 'open', starts_at: startsAt})) {
        return {
          statusSubtitle: '🏁 LIVE',
          statusDetail: 'This event has **started**. Registration is closed.',
          color: defaultColor,
          buttonLabel: 'Registration closed',
          buttonDisabled: true,
          buttonStyle: 2,
        };
      }
      return {
        statusSubtitle: '',
        statusDetail: null,
        color: defaultColor,
        buttonLabel: 'Join in FORZA.EVENTS',
        buttonDisabled: false,
        buttonStyle: 3,
      };
  }
}

export function buildEventEmbed(event: EmbedEventInput) {
  const siteOrigin =
    (globalThis as {Deno?: {env: {get: (name: string) => string | undefined}}}).Deno?.env.get(
      'APP_ORIGIN',
    ) ?? DEFAULT_APP_ORIGIN;
  const coverUrl = resolveCoverAbsolute(event.type, event.cover_image_url, siteOrigin);
  const isOpenBuild = event.car_rule_mode !== 'restricted_list';
  const typeColor = eventTypeEmbedColor(event.type);
  const lifecycle = resolveEmbedLifecycleUi(event.status, event.starts_at, typeColor);

  const title = event.title.trim().slice(0, EMBED_TITLE_MAX);
  const description = buildEmbedDescription(
    lifecycle.statusSubtitle,
    lifecycle.statusDetail,
  );
  const aboutText = event.description?.trim() || null;
  const aboutField: EmbedField | null = aboutText
    ? {
        name: embedFieldName('📝 About'),
        value: truncateFieldValue(aboutText),
        inline: false,
      }
    : null;
  const participantsFields = buildParticipantsFields(event);

  const eventTracks = listEventTracks(event);
  const trackField: EmbedField | null =
    eventTracks.length > 0
      ? {name: embedFieldName('🛣️ Tracks'), value: formatTrackFieldLines(eventTracks), inline: false}
      : null;

  const fixedFields: EmbedField[] = [
    {name: embedFieldName('📅 Date & Time'), value: discordTimestamp(event.starts_at), inline: false},
    ...(trackField ? [trackField] : []),
    ...(aboutField ? [aboutField] : []),
  ];

  const skeletonFields = [...fixedFields, ...participantsFields];
  const skeletonChars = measureEmbedChars({
    title,
    description,
    fields: skeletonFields,
  });
  const skeletonFieldCount = skeletonFields.length + (isOpenBuild ? 1 : 0);

  const carBudget = {
    maxChars: Math.max(0, EMBED_TOTAL_CHAR_MAX - skeletonChars),
    maxFields: Math.max(1, EMBED_FIELDS_MAX - skeletonFieldCount),
  };

  const allCars = event.allowed_cars ?? [];
  let carFit = isOpenBuild
    ? null
    : fitRestrictedCarFields(allCars, carBudget);

  function assembleFields(carFields: EmbedField[]): EmbedField[] {
    const list: EmbedField[] = [...fixedFields];
    if (isOpenBuild) {
      list.push({
        name: embedFieldName('🚗 Car rules'),
        value: truncateFieldValue(formatOpenBuildCarField(event)),
        inline: false,
      });
    } else {
      list.push(...carFields);
    }
    list.push(...participantsFields);
    return list.slice(0, EMBED_FIELDS_MAX);
  }

  let finalFields = assembleFields(carFit?.fields ?? []);

  if (!isOpenBuild && carFit) {
    while (
      measureEmbedChars({title, description, fields: finalFields}) >
        EMBED_TOTAL_CHAR_MAX &&
      carFit.shown > 1
    ) {
      carFit = fitRestrictedCarFields(allCars.slice(0, carFit.shown - 1), carBudget);
      finalFields = assembleFields(carFit.fields);
    }
  }

  const embed = {
    title,
    url: eventDetailUrl(event.id, siteOrigin),
    description,
    color: lifecycle.color,
    image: {url: coverUrl},
    fields: finalFields,
  };

  const components = [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: lifecycle.buttonDisabled ? 2 : lifecycle.buttonStyle,
          label: lifecycle.buttonLabel,
          custom_id: openEventCustomId(event.id),
          ...(lifecycle.buttonDisabled ? {disabled: true} : {}),
        },
      ],
    },
  ];

  return {embeds: [embed], components};
}
