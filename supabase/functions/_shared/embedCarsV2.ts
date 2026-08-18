import {formatCarFullName} from './carDisplay.ts';
import {openBuildHasDisplayRules} from './carRules.ts';
import {formatPiV2} from './discordPiEmoji.ts';
import {normalizeEventGame, type ForzaGame} from './eventGames.ts';
import type {CarRuleMode} from './eventSpec.ts';
import {formatMaxPi} from './pi.ts';
import {formatShareCode} from './shareCode.ts';
import type {EmbedAllowedCar} from './events.ts';

/** Discord Text Display content max. */
const DEFAULT_MAX_CHARS = 4000;
const THIN_SPACE = '\u2009';
const LINE_JOIN = '; ';
const CARS_HEADING = '🚗 **Cars**';

export type EventCarsV2Input = {
  game?: string | null;
  car_rule_mode?: CarRuleMode | string | null;
  max_pi?: number | null;
  additional_car_restrictions?: string | null;
  allowed_cars?: EmbedAllowedCar[];
};

function inlineCode(text: string): string {
  const flat = text.trim().replace(/ +/g, ' ');
  return flat ? `\`${flat.replace(/`/g, "'")}\`` : '';
}

function cleanRules(rules: string[] | null | undefined): string[] {
  return [...new Set((rules ?? []).map((r) => r.trim()).filter(Boolean))];
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const other = new Set(b);
  return a.every((item) => other.has(item));
}

function intersection(lists: string[][]): string[] {
  if (lists.length === 0) return [];
  return lists[0].filter((item) => lists.every((list) => list.includes(item)));
}

function carLineName(car: EmbedAllowedCar): string {
  const name = formatCarFullName(car);
  const year = car.year == null ? NaN : Math.trunc(Number(car.year));
  if (!Number.isFinite(year) || name.includes(`(${year})`)) return name;
  return `${name} (${year})`;
}

function formatTuneV2(code: string): string {
  return formatShareCode(code).replaceAll(' ', THIN_SPACE);
}

function joinBits(bits: string[]): string {
  return bits.filter(Boolean).join(LINE_JOIN);
}

function formatOpenBuildBlocks(input: EventCarsV2Input, game: ForzaGame): EventCarsV2Blocks | null {
  const notes = input.additional_car_restrictions?.trim() || null;
  if (!openBuildHasDisplayRules(input.car_rule_mode, input.max_pi, notes)) return null;
  const bits: string[] = [];
  if (input.max_pi != null) bits.push(formatPiV2(input.max_pi, game));
  if (notes) bits.push(inlineCode(notes));
  return {header: CARS_HEADING, shared: joinBits(bits), list: ''};
}

export type EventCarsV2Blocks = {
  header: string;
  shared: string;
  list: string;
};

function joinCarBlocks(blocks: EventCarsV2Blocks): string {
  return [blocks.header, blocks.shared, blocks.list].filter(Boolean).join('\n');
}

/**
 * Restricted-list V2 copy.
 * Heading → shared PI + rules on one line → one full-name line per car.
 */
export function formatRestrictedCarsV2Blocks(
  cars: EmbedAllowedCar[],
  game: ForzaGame,
  maxChars = DEFAULT_MAX_CHARS,
): EventCarsV2Blocks | null {
  if (cars.length === 0) return null;

  const ruleLists = cars.map((car) => cleanRules(car.car_restrictions));
  const sharedPi = [...new Set(cars.map((car) => formatMaxPi(car.max_pi, game)))];
  const piInHeader = sharedPi.length === 1;
  const anyRules = ruleLists.some((list) => list.length > 0);
  const allSameRules = anyRules && ruleLists.every((list) => sameSet(list, ruleLists[0]));
  const sharedRules = anyRules && !allSameRules ? intersection(ruleLists) : [];
  const sharedLine = allSameRules ? ruleLists[0] : sharedRules;

  const header = CARS_HEADING;
  const sharedBits: string[] = [];
  if (piInHeader) sharedBits.push(formatPiV2(cars[0].max_pi, game));
  for (const rule of sharedLine) sharedBits.push(inlineCode(rule));
  const shared = joinBits(sharedBits);
  const prefix = [header, shared].filter(Boolean).join('\n');

  const lines = cars.map((car, i) => {
    const name = carLineName(car);
    const bits = [piInHeader ? name : `${formatPiV2(car.max_pi, game)} ${name}`];
    const tune = car.tune_share_code?.trim();
    if (tune) bits.push(inlineCode(formatTuneV2(tune)));
    if (anyRules && !allSameRules) {
      const extra = ruleLists[i].filter((rule) => !sharedLine.includes(rule));
      for (const rule of extra) bits.push(inlineCode(rule));
    }
    return joinBits(bits);
  });

  const packed: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const rest = lines.length - i;
    const next = [prefix, ...packed, lines[i]].filter(Boolean).join('\n');
    if (next.length <= maxChars) {
      packed.push(lines[i]);
      continue;
    }
    if (packed.length === 0) {
      return {header, shared, list: lines[i].slice(0, Math.max(0, maxChars - prefix.length))};
    }
    const withPlus = [prefix, ...packed, `+${rest}`].filter(Boolean).join('\n');
    if (withPlus.length <= maxChars) return {header, shared, list: [...packed, `+${rest}`].join('\n')};
    return {header, shared, list: packed.join('\n')};
  }
  return {header, shared, list: packed.join('\n')};
}

export function formatRestrictedCarsV2(
  cars: EmbedAllowedCar[],
  game: ForzaGame,
  maxChars = DEFAULT_MAX_CHARS,
): string | null {
  const blocks = formatRestrictedCarsV2Blocks(cars, game, maxChars);
  return blocks ? joinCarBlocks(blocks) : null;
}

export function formatEventCarsV2Blocks(
  input: EventCarsV2Input,
  opts?: {maxChars?: number},
): EventCarsV2Blocks | null {
  const game = normalizeEventGame(input.game);
  if (input.car_rule_mode !== 'restricted_list') {
    return formatOpenBuildBlocks(input, game);
  }
  return formatRestrictedCarsV2Blocks(
    input.allowed_cars ?? [],
    game,
    opts?.maxChars ?? DEFAULT_MAX_CHARS,
  );
}

export function formatEventCarsV2(
  input: EventCarsV2Input,
  opts?: {maxChars?: number},
): string | null {
  const blocks = formatEventCarsV2Blocks(input, opts);
  return blocks ? joinCarBlocks(blocks) : null;
}
