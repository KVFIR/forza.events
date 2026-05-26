import {resolveCoverAbsolute} from './eventCovers.ts';
import {openEventCustomId} from './eventLaunch.ts';
import {eventTypeEmbedColor} from './eventTypes.ts';
import type {CarRuleMode} from './eventSpec.ts';
import {formatMaxPi} from './pi.ts';

const LOBBY_TOTAL_PLAYERS = 12;
const EMBED_FIELD_VALUE_MAX = 1024;

export type EmbedAllowedCar = {
  make: string;
  model: string;
  year: number | null;
  max_pi: number;
  tune_share_code?: string | null;
  car_restrictions?: string[];
};

export type EmbedEventInput = {
  id: string;
  title: string;
  type: string;
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
  return (eventCars ?? [])
    .map((ec) => {
      const raw = ec.cars;
      const car = (Array.isArray(raw) ? raw[0] : raw) as {
        make: string;
        model: string;
        year: number | null;
      } | null;
      if (!car) return null;
      return {
        make: car.make,
        model: car.model,
        year: car.year,
        max_pi: ec.max_pi,
        tune_share_code: ec.tune_share_code,
        car_restrictions: ec.car_restrictions ?? [],
      };
    })
    .filter((c): c is EmbedAllowedCar => c !== null);
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

function formatTrackCodes(event: EmbedEventInput): string {
  const codes = [event.event_share_code, ...(event.track_codes ?? [])].filter(
    (code): code is string => Boolean(code?.trim()),
  );
  if (codes.length === 0) return 'TBA';
  return codes
    .map((code, i) => `${i + 1}. \`${code.trim()}\``)
    .join('\n');
}

function resolveOpenBuildNotes(event: EmbedEventInput): string | null {
  const text =
    event.additional_car_restrictions ??
    (event.rules_allowed ?? [])
      .find((rule) => rule.startsWith('additional:'))
      ?.slice('additional:'.length);
  return text?.trim() || null;
}

function formatCarLabel(car: EmbedAllowedCar): string {
  const name = [car.year, car.make, car.model].filter(Boolean).join(' ');
  return `${name} · ${formatMaxPi(car.max_pi)}`;
}

function formatRestrictedCarBlock(car: EmbedAllowedCar): string {
  const lines = [formatCarLabel(car)];
  const extras: string[] = [];
  if (car.tune_share_code?.trim()) {
    extras.push(`\`${car.tune_share_code.trim()}\``);
  }
  const restrictions = (car.car_restrictions ?? []).filter(Boolean);
  if (restrictions.length > 0) {
    extras.push(restrictions.join(', '));
  }
  if (extras.length > 0) {
    lines.push(extras.join(' · '));
  }
  return lines.join('\n');
}

function chunkEmbedFieldValues(blocks: string[], max = EMBED_FIELD_VALUE_MAX): string[] {
  const chunks: string[] = [];
  let current = '';
  for (const block of blocks) {
    const piece = chunks.length > 0 || current ? `\n\n${block}` : block;
    if (current.length + piece.length > max && current) {
      chunks.push(current);
      current = block;
    } else {
      current += piece;
    }
  }
  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : ['Restricted car list (no cars configured)'];
}

function restrictedCarFields(cars: EmbedAllowedCar[]): {name: string; value: string; inline: false}[] {
  if (cars.length === 0) {
    return [{name: '🚗 Car', value: 'Restricted car list (no cars configured)', inline: false}];
  }
  const blocks = cars.map(formatRestrictedCarBlock);
  const values = chunkEmbedFieldValues(blocks);
  return values.map((value, i) => ({
    name: i === 0 ? '🚗 Car' : `🚗 Car (${i + 1}/${values.length})`,
    value,
    inline: false as const,
  }));
}

function formatOpenBuildCarField(event: EmbedEventInput): string {
  const pi = event.max_pi ? formatMaxPi(event.max_pi) : 'PI cap';
  return `Open build · ${pi}`;
}

function formatOpenBuildRestrictionsField(event: EmbedEventInput): string | null {
  return resolveOpenBuildNotes(event);
}

function embedFooter(guildName?: string | null): {text: string} {
  const server = guildName?.trim();
  if (server) {
    return {text: `${server} · FORZA.EVENTS`};
  }
  return {text: 'FORZA.EVENTS'};
}

export function buildEventEmbed(event: EmbedEventInput) {
  const siteOrigin =
    (globalThis as {Deno?: {env: {get: (name: string) => string | undefined}}}).Deno?.env.get(
      'APP_ORIGIN',
    ) ?? 'https://forza.events';
  const coverUrl = resolveCoverAbsolute(event.type, event.cover_image_url, siteOrigin);
  const isOpenBuild = event.car_rule_mode !== 'restricted_list';
  const lobbyCount = formatLobbyCount(event.current_players);

  const fields: {name: string; value: string; inline?: boolean}[] = [
    {name: '📅 Date', value: discordTimestamp(event.starts_at), inline: false},
    {name: '🛣️ Track', value: formatTrackCodes(event), inline: false},
  ];

  if (isOpenBuild) {
    fields.push({name: '🚗 Car', value: formatOpenBuildCarField(event), inline: false});
  } else {
    fields.push(...restrictedCarFields(event.allowed_cars ?? []));
  }

  if (isOpenBuild) {
    const restrictions = formatOpenBuildRestrictionsField(event);
    if (restrictions) {
      fields.push({name: '🔧 Restrictions', value: restrictions, inline: false});
    }
  }

  fields.push({
    name: `👤 Participants (${lobbyCount})`,
    value: `Convoy leader: ${event.lobby_leader_gamertag.trim() || 'TBD'}`,
    inline: false,
  });

  const embed = {
    title: event.title,
    description: event.description?.slice(0, 300) ?? undefined,
    color: eventTypeEmbedColor(event.type),
    image: {url: coverUrl},
    fields,
    footer: embedFooter(event.guild_name),
  };

  const components = [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 1,
          label: 'Open in FORZA.EVENTS',
          custom_id: openEventCustomId(event.id),
        },
      ],
    },
  ];

  return {embeds: [embed], components};
}
