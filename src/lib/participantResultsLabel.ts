import type {TFunction} from 'i18next';
import {hasFinishingPosition} from './eventResults';
import type {ParticipantEventResult} from './participantResults';

export function participantResultLabel(
  result: ParticipantEventResult | undefined,
  t: TFunction,
): string | null {
  if (!result) return null;
  if (result.dns) return t('results.dns');
  if (result.dnf) return t('results.dnf');
  if (!hasFinishingPosition(result)) return null;
  return t('results.positionShort', {position: result.position});
}
