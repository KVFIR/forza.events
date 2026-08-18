import type {ForzaGame} from './eventGames.ts';
import {clampPi, piToClass, type CarClassLetter} from './pi.ts';

const PI_CLASS_EMOJI_ID: Record<CarClassLetter, string> = {
  D: '1539264823286702081',
  C: '1539264826247745626',
  B: '1539264828743618560',
  A: '1539264831734030407',
  S1: '1539264834229506161',
  S2: '1539264836314079306',
  R: '1539264839392690270',
  X: '1539264842760847370',
};

export function piClassEmojiName(letter: CarClassLetter): string {
  return `pi_${letter.toLowerCase()}`;
}

export function formatPiClassEmoji(letter: CarClassLetter): string {
  return `<:${piClassEmojiName(letter)}:${PI_CLASS_EMOJI_ID[letter]}>`;
}

/** `<:pi_b:id>`600`` — class emoji + PI number in backticks. */
export function formatPiV2(maxPi: number, game: ForzaGame = 'fh6'): string {
  const p = clampPi(maxPi);
  return `${formatPiClassEmoji(piToClass(p, game))}\`${p}\``;
}
