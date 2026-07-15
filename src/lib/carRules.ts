import type {ForzaEvent} from './types';
import {formatMaxPi} from './pi';

/** Open build shows car rules only when a PI cap and/or extra notes are set. */
export function openBuildHasDisplayRules(
  input: Pick<ForzaEvent, 'carRuleMode' | 'maxPi' | 'additionalCarRestrictions'>,
): boolean {
  if (input.carRuleMode !== 'anything_goes') return false;
  return input.maxPi != null || Boolean(input.additionalCarRestrictions?.trim());
}

/** Label + optional PI for cards/detail; null when nothing to show. */
export function formatOpenBuildCarRulesDisplay(
  input: Pick<ForzaEvent, 'maxPi' | 'additionalCarRestrictions'>,
): {notes: string | null; piLabel: string | null} | null {
  const notes = input.additionalCarRestrictions?.trim() || null;
  const piLabel = input.maxPi != null ? formatMaxPi(input.maxPi) : null;
  if (!notes && !piLabel) return null;
  return {notes, piLabel};
}
