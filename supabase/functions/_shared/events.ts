import {formatCarEmbedName} from './carDisplay.ts';
import {eventHasStarted} from './eventSpec.ts';
import {resolveCoverAbsolute} from './eventCovers.ts';
import {openEventCustomId} from './eventLaunch.ts';
import {eventTypeEmbedColor} from './eventTypes.ts';
import type {CarRuleMode} from './eventSpec.ts';
import {formatMaxPi} from './pi.ts';

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
  event_share_code?: string | null;
  track_codes?: string[] | null;
  rules_allowed?: string[] | null;
  additional_car_restrictions?: string | null;
  lobby_leader_gamertag: string;
  cover_image_url?: string | null;
  description?: string | null;
  guild_name?: string | null;
  allowed_cars?: EmbedAllowedCar[];
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

function discordTimestamp(iso: string, style: 'F' | 'R' = 'F'): string {
  const unix = Math.floor(new Date(iso).getTime() / 1000);
  if (!Number.isFinite(unix)) return iso;
  return `<t:${unix}:${style}>`;
}

function formatLobbyCount(currentPlayers: number): string {
  const filled = 1 + Math.max(0, currentPlayers);
  return `${filled}/${LOBBY_TOTAL_PLAYERS}`;
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

function listTrackCodes(event: EmbedEventInput): string[] {
  const seen = new Set<string>();
  const codes: string[] = [];
  for (const raw of [event.event_share_code, ...(event.track_codes ?? [])]) {
    const code = raw?.trim();
    if (!code) continue;
    const key = code.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    codes.push(code);
  }
  return codes;
}

function formatTrackCodes(codes: string[]): string {
  if (codes.length === 1) {
    return truncateFieldValue(inlineCode(codes[0]));
  }

  let result = '';
  for (let i = 0; i < codes.length; i++) {
    const line = `${i + 1}. ${inlineCode(codes[i])}`;
    const next = result ? `${result}\n${line}` : line;
    const remaining = codes.length - i - 1;
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
  for (const rule of (car.car_restrictions ?? []).filter(Boolean)) {
    coded.push(inlineCode(rule));
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
      fields: [{name: embedFieldName('🚗 Car'), value: 'Restricted car list (no cars configured)', inline: false}],
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
      name: embedFieldName('🚗 Car', values.length > 1 ? `${i + 1}/${values.length}` : undefined),
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
        name: embedFieldName('🚗 Car'),
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
  return `Open build ${inlineCode(pi)}`;
}

function formatOpenBuildRestrictionsField(event: EmbedEventInput): string | null {
  return resolveOpenBuildNotes(event);
}

const EMBED_STATUS_COLORS: Record<string, number> = {
  cancelled: 0x6b7280,
  completed: 0x374151,
  archived: 0x374151,
};

type EmbedLifecycleUi = {
  titlePrefix: string;
  color: number;
  statusField: EmbedField | null;
  buttonLabel: string;
  buttonDisabled: boolean;
  buttonStyle: 1 | 2 | 3 | 4;
};

function resolveEmbedLifecycleUi(
  status: string | undefined,
  startsAt: string,
  defaultColor: number,
): EmbedLifecycleUi {
  switch (status) {
    case 'cancelled':
      return {
        titlePrefix: '🚫 CANCELLED ',
        color: EMBED_STATUS_COLORS.cancelled,
        statusField: {
          name: embedFieldName('Status'),
          value: 'This event was **cancelled** by the host. Registration is closed.',
          inline: false,
        },
        buttonLabel: 'Event cancelled',
        buttonDisabled: true,
        buttonStyle: 2,
      };
    case 'completed':
      return {
        titlePrefix: '✅ COMPLETED ',
        color: EMBED_STATUS_COLORS.completed,
        statusField: {
          name: embedFieldName('Status'),
          value: 'Results are in — open **FORZA.EVENTS** for standings.',
          inline: false,
        },
        buttonLabel: 'View in FORZA.EVENTS',
        buttonDisabled: false,
        buttonStyle: 1,
      };
    case 'archived':
      return {
        titlePrefix: '📦 ARCHIVED ',
        color: EMBED_STATUS_COLORS.archived,
        statusField: {
          name: embedFieldName('Status'),
          value: 'This event is archived.',
          inline: false,
        },
        buttonLabel: 'View in FORZA.EVENTS',
        buttonDisabled: false,
        buttonStyle: 1,
      };
    default:
      if (eventHasStarted({status: status ?? 'open', starts_at: startsAt})) {
        return {
          titlePrefix: '🏁 LIVE ',
          color: defaultColor,
          statusField: {
            name: embedFieldName('Status'),
            value: 'This event has **started**. Registration is closed.',
            inline: false,
          },
          buttonLabel: 'Registration closed',
          buttonDisabled: true,
          buttonStyle: 2,
        };
      }
      return {
        titlePrefix: '',
        color: defaultColor,
        statusField: null,
        buttonLabel: '✅ Register for the Event',
        buttonDisabled: false,
        buttonStyle: 3,
      };
  }
}

export function buildEventEmbed(event: EmbedEventInput) {
  const siteOrigin =
    (globalThis as {Deno?: {env: {get: (name: string) => string | undefined}}}).Deno?.env.get(
      'APP_ORIGIN',
    ) ?? 'https://forza.events';
  const coverUrl = resolveCoverAbsolute(event.type, event.cover_image_url, siteOrigin);
  const isOpenBuild = event.car_rule_mode !== 'restricted_list';
  const lobbyCount = formatLobbyCount(event.current_players);
  const typeColor = eventTypeEmbedColor(event.type);
  const lifecycle = resolveEmbedLifecycleUi(event.status, event.starts_at, typeColor);

  const rawTitle = `${lifecycle.titlePrefix}${event.title}`.trim();
  const title = rawTitle.slice(0, EMBED_TITLE_MAX);
  const description = event.description?.trim()
    ? event.description.slice(0, EMBED_DESCRIPTION_MAX)
    : undefined;
  const participantsField: EmbedField = {
    name: embedFieldName(`👤 Participants (${lobbyCount})`),
    value: truncateFieldValue(`Convoy leader: ${event.lobby_leader_gamertag.trim() || 'TBD'}`),
    inline: false,
  };

  const trackCodes = listTrackCodes(event);
  const trackField: EmbedField | null =
    trackCodes.length > 0
      ? {name: embedFieldName('🛣️ Track'), value: formatTrackCodes(trackCodes), inline: false}
      : null;

  const fixedFields: EmbedField[] = [
    {name: embedFieldName('📅 Date'), value: discordTimestamp(event.starts_at), inline: false},
    ...(trackField ? [trackField] : []),
  ];

  const restrictionsText = isOpenBuild ? formatOpenBuildRestrictionsField(event) : null;
  const restrictionsField: EmbedField | null = restrictionsText
    ? {
        name: embedFieldName('🔧 Restrictions'),
        value: truncateFieldValue(restrictionsText),
        inline: false,
      }
    : null;

  const skeletonFields = [
    ...fixedFields,
    ...(lifecycle.statusField ? [lifecycle.statusField] : []),
    ...(restrictionsField ? [restrictionsField] : []),
    participantsField,
  ];
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
        name: embedFieldName('🚗 Car'),
        value: truncateFieldValue(formatOpenBuildCarField(event)),
        inline: false,
      });
      if (restrictionsField) list.push(restrictionsField);
    } else {
      list.push(...carFields);
    }
    list.push(participantsField);
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
